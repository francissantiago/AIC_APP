import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { AnnouncementsService } from '../announcements/announcements.service';
import { Member } from '../members/entities/member.entity';
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
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Congregation)
    private readonly congregationsRepository: Repository<Congregation>,
    private readonly notificationsService: NotificationsService,
    private readonly announcementsService: AnnouncementsService,
    private readonly congregationsService: CongregationsService,
  ) {}

  @Cron('0 8 * * *', {
    name: 'notifications-visitor-follow-up',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  async handleVisitorFollowUp(): Promise<void> {
    const congregationIds = await this.listActiveCongregationIds();
    let created = 0;
    let skipped = 0;
    let eligible = 0;

    for (const congregationId of congregationIds) {
      const recipients = await this.resolveSecretariatUserIds(congregationId);

      if (recipients.length === 0) {
        this.logger.warn(
          `Job visitor-follow-up [${congregationId}]: nenhum destinatário com secretariat:read/write + membership`,
        );
        continue;
      }

      const visitors = await this.visitorsRepository
        .createQueryBuilder('v')
        .where('v.deleted_at IS NULL')
        .andWhere('v.follow_up_done = 0')
        .andWhere('v.congregation_id = :congregationId', { congregationId })
        .andWhere('DATEDIFF(CURDATE(), v.visit_date) > 7')
        .getMany();

      eligible += visitors.length;

      for (const visitor of visitors) {
        const daysSinceVisit = this.computeDaysSinceVisit(visitor.visitDate);
        const title = 'Acompanhamento de visitante pendente';
        const body = `O visitante ${visitor.fullName} aguarda acompanhamento há mais de 7 dias (visita em ${visitor.visitDate}).`;
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
              `Falha ao criar acompanhamento (visitor=${visitor.id}, user=${userId})`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }
      }
    }

    this.logger.log(
      `Job visitor-follow-up: elegíveis=${eligible}, criadas=${created}, dedupe-skipped=${skipped}`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'notifications-schedule-reminder',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  async handleScheduleReminder(): Promise<void> {
    const congregationIds = await this.listActiveCongregationIds();
    let created = 0;
    let skipped = 0;
    let eligible = 0;

    for (const congregationId of congregationIds) {
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

      eligible += rows.length;

      for (const row of rows) {
        const recipientIds = await this.resolveScheduleRecipientIds(
          row,
          congregationId,
        );
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

          const payloadForRecipient: Record<string, unknown> = {
            ...payload,
            isMemberRecipient,
          };

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
              payload: payloadForRecipient,
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
    }

    this.logger.log(
      `Job schedule-reminder: elegíveis=${eligible}, criadas=${created}, dedupe-skipped=${skipped}`,
    );
  }

  @Cron('0 8 * * *', {
    name: 'notifications-member-birthday',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  })
  async handleMemberBirthday(): Promise<void> {
    const congregationIds = await this.listActiveCongregationIds();
    let created = 0;
    let skipped = 0;
    let eligible = 0;

    for (const congregationId of congregationIds) {
      const members = await this.membersRepository
        .createQueryBuilder('m')
        .where('m.deleted_at IS NULL')
        .andWhere('m.status = :status', { status: MemberStatus.ACTIVE })
        .andWhere('m.birth_date IS NOT NULL')
        .andWhere('m.congregation_id = :congregationId', { congregationId })
        .andWhere('MONTH(m.birth_date) = MONTH(CURDATE())')
        .andWhere('DAY(m.birth_date) = DAY(CURDATE())')
        .getMany();

      if (members.length === 0) {
        continue;
      }

      eligible += members.length;

      const authorUserId =
        await this.resolveBirthdayAuthorUserId(congregationId);
      if (authorUserId) {
        try {
          const boardResult =
            await this.announcementsService.upsertDailyBirthdayBoard(
              congregationId,
              members.map((member) => ({
                fullName: member.fullName,
                birthDate: member.birthDate as string,
              })),
              authorUserId,
            );
          this.logger.log(
            `Job member-birthday mural [${congregationId}]: ${boardResult}`,
          );
        } catch (error) {
          this.logger.error(
            `Falha ao publicar mural de aniversários [${congregationId}]`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      } else {
        this.logger.warn(
          `Job member-birthday [${congregationId}]: nenhum autor elegível para mural`,
        );
      }

      const recipients =
        await this.resolveMemberManagementUserIds(congregationId);
      if (recipients.length === 0) {
        this.logger.warn(
          `Job member-birthday [${congregationId}]: nenhum destinatário com secretariat:read ou members:read + membership`,
        );
        continue;
      }

      const birthdayYear = new Date().getFullYear();

      for (const member of members) {
        const birthDate = member.birthDate as string;
        const referenceId = buildBirthdayReferenceId(member.id, birthdayYear);
        const title = 'Aniversariante do dia';
        const body = `${member.fullName} faz aniversário hoje (${birthDate}).`;
        const payload: Record<string, unknown> = {
          memberId: member.id,
          memberFullName: member.fullName,
          birthDate,
          birthdayYear,
        };

        for (const userId of recipients) {
          try {
            const result = await this.notificationsService.createIfAbsent({
              userId,
              type: NotificationType.MEMBER_BIRTHDAY,
              title,
              body,
              payload,
              referenceType: NotificationReferenceType.MEMBER,
              referenceId,
            });
            if (result) {
              created += 1;
            } else {
              skipped += 1;
            }
          } catch (error) {
            this.logger.error(
              `Falha ao criar aniversário (member=${member.id}, user=${userId})`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }
      }
    }

    if (eligible === 0) {
      this.logger.log('Job member-birthday: nenhum aniversariante elegível');
    }

    this.logger.log(
      `Job member-birthday: elegíveis=${eligible}, criadas=${created}, dedupe-skipped=${skipped}`,
    );
  }

  /** AIC-SEC-021: permission + membership na congregação do job. */
  async resolveMemberManagementUserIds(
    congregationId: string,
  ): Promise<string[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
      .innerJoin('role_permissions', 'rp', 'rp.role_id = ur.role_id')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .innerJoin(
        'user_congregations',
        'uc',
        'uc.user_id = u.id AND uc.congregation_id = :congregationId',
        { congregationId },
      )
      .select('DISTINCT u.id', 'id')
      .where('u.deleted_at IS NULL')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('p.code IN (:...codes)', {
        codes: ['secretariat:read', 'members:read'],
      })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  private async resolveBirthdayAuthorUserId(
    congregationId: string,
  ): Promise<string | null> {
    const managementIds =
      await this.resolveMemberManagementUserIds(congregationId);
    if (managementIds.length > 0) {
      return managementIds[0];
    }

    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
      .innerJoin('role_permissions', 'rp', 'rp.role_id = ur.role_id')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .innerJoin(
        'user_congregations',
        'uc',
        'uc.user_id = u.id AND uc.congregation_id = :congregationId',
        { congregationId },
      )
      .select('DISTINCT u.id', 'id')
      .where('u.deleted_at IS NULL')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('p.code = :code', { code: 'announcements:write' })
      .getRawMany<{ id: string }>();

    return rows[0]?.id ?? null;
  }

  /** AIC-SEC-021: permission + membership na congregação do job. */
  async resolveSecretariatUserIds(congregationId: string): Promise<string[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
      .innerJoin('role_permissions', 'rp', 'rp.role_id = ur.role_id')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .innerJoin(
        'user_congregations',
        'uc',
        'uc.user_id = u.id AND uc.congregation_id = :congregationId',
        { congregationId },
      )
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
    congregationId: string,
  ): Promise<string[]> {
    if (
      row.memberUserId !== null &&
      row.memberUserStatus === UserStatus.ACTIVE
    ) {
      return [row.memberUserId];
    }
    return this.resolveSecretariatUserIds(congregationId);
  }

  /** AIC-SEC-021: itera congregações ativas (não só HQ). */
  private async listActiveCongregationIds(): Promise<string[]> {
    const rows = await this.congregationsRepository.find({
      where: { status: CongregationStatus.ACTIVE, deletedAt: IsNull() },
      select: ['id'],
    });
    if (rows.length > 0) {
      return rows.map((row) => row.id);
    }
    return [(await this.congregationsService.getOrCreateBase()).id];
  }

  private computeDaysSinceVisit(visitDate: string): number {
    const visit = new Date(`${visitDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - visit.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

export function buildBirthdayReferenceId(
  memberId: string,
  year: number,
): string {
  const digest = createHash('sha256')
    .update(`${memberId}:${year}`)
    .digest('hex')
    .slice(0, 32);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
}
