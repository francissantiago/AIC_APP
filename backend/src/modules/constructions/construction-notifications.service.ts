import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { NotificationReferenceType } from '../notifications/enums/notification-reference-type.enum';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { ConstructionProject } from './entities/construction-project.entity';
import { ConstructionUpdate } from './entities/construction-update.entity';
import { buildBudgetAlertReferenceId } from './construction-notification-refs';

@Injectable()
export class ConstructionNotificationsService {
  private readonly logger = new Logger(ConstructionNotificationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyUpdateCreated(
    update: ConstructionUpdate,
    project: ConstructionProject,
    actorUserId?: string,
  ): Promise<void> {
    const recipients = await this.resolveReaderUserIds(project.congregationId);
    const title = 'Novo andamento de obra';
    const body = `Andamento "${update.title}" registrado na obra "${project.name}".`;
    const payload: Record<string, unknown> = {
      projectId: project.id,
      projectName: project.name,
      updateId: update.id,
      updateTitle: update.title,
    };

    await this.dispatch(
      recipients,
      actorUserId,
      NotificationType.CONSTRUCTION_UPDATE,
      NotificationReferenceType.CONSTRUCTION_UPDATE,
      update.id,
      title,
      body,
      payload,
    );
  }

  async notifyStatusChange(
    project: ConstructionProject,
    previousStatus: string,
    actorUserId?: string,
  ): Promise<void> {
    const recipients = await this.resolveReaderUserIds(project.congregationId);
    const title = 'Status da obra alterado';
    const body = `A obra "${project.name}" mudou de "${previousStatus}" para "${project.status}".`;
    const payload: Record<string, unknown> = {
      projectId: project.id,
      projectName: project.name,
      previousStatus,
      currentStatus: project.status,
    };

    await this.dispatch(
      recipients,
      actorUserId,
      NotificationType.CONSTRUCTION_STATUS_CHANGE,
      NotificationReferenceType.CONSTRUCTION_PROJECT,
      project.id,
      title,
      body,
      payload,
    );
  }

  async notifyBudgetAlert(
    project: ConstructionProject,
    actorUserId?: string,
  ): Promise<void> {
    if (!project.budgetAmount) return;

    const budget = Number(project.budgetAmount);
    const spent = Number(project.spentAmount);
    if (!Number.isFinite(budget) || budget <= 0) return;
    if (spent / budget < 0.8) return;

    const recipients = await this.resolveReaderUserIds(project.congregationId);
    const usagePercent = Math.round((spent / budget) * 10000) / 100;
    const title = 'Alerta de orçamento da obra';
    const body = `A obra "${project.name}" atingiu ${usagePercent}% do orçamento previsto.`;
    const payload: Record<string, unknown> = {
      projectId: project.id,
      projectName: project.name,
      spentAmount: project.spentAmount,
      budgetAmount: project.budgetAmount,
      usagePercent,
    };

    await this.dispatch(
      recipients,
      actorUserId,
      NotificationType.CONSTRUCTION_BUDGET_ALERT,
      NotificationReferenceType.CONSTRUCTION_PROJECT,
      buildBudgetAlertReferenceId(project.id),
      title,
      body,
      payload,
    );
  }

  async resolveReaderUserIds(congregationId: string): Promise<string[]> {
    void congregationId;
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .innerJoin('user_roles', 'ur', 'ur.user_id = u.id')
      .innerJoin('role_permissions', 'rp', 'rp.role_id = ur.role_id')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .select('DISTINCT u.id', 'id')
      .where('u.deleted_at IS NULL')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('p.code = :code', { code: 'constructions:read' })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  private async dispatch(
    recipients: string[],
    actorUserId: string | undefined,
    type: NotificationType,
    referenceType: NotificationReferenceType,
    referenceId: string,
    title: string,
    body: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const filtered =
      actorUserId && recipients.length === 1 && recipients[0] === actorUserId
        ? []
        : recipients.filter((userId) => userId !== actorUserId);

    for (const userId of filtered) {
      try {
        await this.notificationsService.createIfAbsent({
          userId,
          type,
          title,
          body,
          payload,
          referenceType,
          referenceId,
        });
      } catch (error) {
        this.logger.error(
          `Falha ao notificar obra (type=${type}, user=${userId})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
