import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { MemberStatus } from '../members/enums/member-status.enum';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsService } from './notifications.service';

interface EligibleScheduleRow {
  assignmentId: string;
  calendarEventId: string;
  eventTitle: string;
  startsAt: Date;
  roleLabel: string;
  memberId: string;
  memberFullName: string;
  memberUserId: string | null;
  memberUserStatus: UserStatus | null;
}

@Injectable()
export class NotificationsJobsService {
  private readonly logger = new Logger(NotificationsJobsService.name);

  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
    @InjectRepository(ScheduleAssignment)
    private readonly scheduleAssignmentsRepository: Repository<ScheduleAssignment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly congregationsService: CongregationsService,
  ) {}

  @Cron('0 8 * * *', {
    name: 'notifications-visitor-follow-up',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  async handleVisitorFollowUp(): Promise<void> {
    const congregationId = await this.getCongregationId();
    const recipients = await this.resolveSecretariatUserIds();

    if (recipients.length === 0) {
      this.logger.warn(
        'Job visitor-follow-up: nenhum destinatário com secretariat:read/write',
      );
      return;
    }

    const visitors = await this.visitorsRepository
      .createQueryBuilder('v')
      .where('v.deleted_at IS NULL')
      .andWhere('v.follow_up_done = 0')
      .andWhere('v.congregation_id = :congregationId', { congregationId })
      .andWhere('DATEDIFF(CURDATE(), v.visit_date) > 7')
      .getMany();

    let created = 0;
    let skipped = 0;

    for (const visitor of visitors) {
      const daysSinceVisit = this.computeDaysSinceVisit(visitor.visitDate);
      const title = 'Follow-up de visitante pendente';
      const body = `O visitante ${visitor.fullName} aguarda follow-up há mais de 7 dias (visita em ${visitor.visitDate}).`;
      const payload: Record<string, unknown> = {
        visitorId: visitor.id,
        visitorFullName: visitor.fullName,
        visitDate: visitor.visitDate,
        daysSinceVisit,
      };

      for (const userId of recipients) {
        try {
          const result = await this.notificationsService.createIfAbsent({
            userId,
            type: NotificationType.VISITOR_FOLLOW_UP,
            title,
            body,
            payload,
            referenceType: NotificationReferenceType.VISITOR,
            referenceId: visitor.id,
          });
          if (result) {
            created += 1;
          } else {
            skipped += 1;
          }
        } catch (error) {
          this.logger.error(
            `Falha ao criar follow-up (visitor=${visitor.id}, user=${userId})`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    this.logger.log(
      `Job visitor-follow-up: elegíveis=${visitors.length}, criadas=${created}, dedupe-skipped=${skipped}`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'notifications-schedule-reminder',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  async handleScheduleReminder(): Promise<void> {
    const congregationId = await this.getCongregationId();

    const rows = await this.scheduleAssignmentsRepository
      .createQueryBuilder('sa')
      .innerJoin('sa.calendarEvent', 'ce')
      .innerJoin('sa.member', 'm')
      .leftJoin(User, 'mu', 'mu.id = m.user_id AND mu.deleted_at IS NULL')
      .select('sa.id', 'assignmentId')
      .addSelect('sa.calendar_event_id', 'calendarEventId')
      .addSelect('ce.title', 'eventTitle')
      .addSelect('ce.starts_at', 'startsAt')
      .addSelect('sa.role_label', 'roleLabel')
      .addSelect('sa.member_id', 'memberId')
      .addSelect('m.full_name', 'memberFullName')
      .addSelect('m.user_id', 'memberUserId')
      .addSelect('mu.status', 'memberUserStatus')
      .where('sa.confirmed = 0')
      .andWhere('ce.deleted_at IS NULL')
      .andWhere('m.deleted_at IS NULL')
      .andWhere('m.status = :memberStatus', {
        memberStatus: MemberStatus.ACTIVE,
      })
      .andWhere('ce.congregation_id = :congregationId', { congregationId })
      .andWhere('ce.starts_at > NOW()')
      .andWhere('ce.starts_at <= DATE_ADD(NOW(), INTERVAL 48 HOUR)')
      .getRawMany<EligibleScheduleRow>();

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const recipientIds = await this.resolveScheduleRecipientIds(row);
      const startsAtIso =
        row.startsAt instanceof Date
          ? row.startsAt.toISOString()
          : new Date(row.startsAt).toISOString();

      const payload: Record<string, unknown> = {
        scheduleAssignmentId: row.assignmentId,
        calendarEventId: row.calendarEventId,
        eventTitle: row.eventTitle,
        startsAt: startsAtIso,
        roleLabel: row.roleLabel,
        memberId: row.memberId,
        memberFullName: row.memberFullName,
      };

      for (const userId of recipientIds) {
        const isMemberRecipient =
          row.memberUserId !== null &&
          row.memberUserStatus === UserStatus.ACTIVE &&
          userId === row.memberUserId;

        const title = 'Confirmação de escala pendente';
        const body = isMemberRecipient
          ? `Você está escalado(a) como ${row.roleLabel} em "${row.eventTitle}" (${startsAtIso}). Confirme sua presença.`
          : `O membro ${row.memberFullName} está escalado(a) como ${row.roleLabel} em "${row.eventTitle}" (${startsAtIso}) sem confirmação.`;

        try {
          const result = await this.notificationsService.createIfAbsent({
            userId,
            type: NotificationType.SCHEDULE_REMINDER,
            title,
            body,
            payload,
            referenceType: NotificationReferenceType.SCHEDULE_ASSIGNMENT,
            referenceId: row.assignmentId,
          });
          if (result) {
            created += 1;
          } else {
            skipped += 1;
          }
        } catch (error) {
          this.logger.error(
            `Falha ao criar lembrete de escala (assignment=${row.assignmentId}, user=${userId})`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    this.logger.log(
      `Job schedule-reminder: elegíveis=${rows.length}, criadas=${created}, dedupe-skipped=${skipped}`,
    );
  }

  async resolveSecretariatUserIds(): Promise<string[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
      .innerJoin('role_permissions', 'rp', 'rp.role_id = ur.role_id')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .select('DISTINCT u.id', 'id')
      .where('u.deleted_at IS NULL')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('p.code IN (:...codes)', {
        codes: ['secretariat:read', 'secretariat:write'],
      })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  private async resolveScheduleRecipientIds(
    row: EligibleScheduleRow,
  ): Promise<string[]> {
    if (
      row.memberUserId !== null &&
      row.memberUserStatus === UserStatus.ACTIVE
    ) {
      return [row.memberUserId];
    }
    return this.resolveSecretariatUserIds();
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private computeDaysSinceVisit(visitDate: string): number {
    const visit = new Date(`${visitDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - visit.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
