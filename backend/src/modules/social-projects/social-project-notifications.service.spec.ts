import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { SocialProject } from './entities/social-project.entity';
import { SocialProjectStatus } from './enums/social-project-status.enum';
import { buildBudgetAlertReferenceId } from './social-project-notification-refs';
import { SocialProjectNotificationsService } from './social-project-notifications.service';

describe('SocialProjectNotificationsService', () => {
  let service: SocialProjectNotificationsService;

  const usersRepository = {
    createQueryBuilder: jest.fn(),
  };
  const notificationsService = {
    createIfAbsent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialProjectNotificationsService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(SocialProjectNotificationsService);
  });

  it('buildBudgetAlertReferenceId gera UUID estável', () => {
    const projectId = '11111111-2222-3333-4444-555555555555';
    const first = buildBudgetAlertReferenceId(projectId);
    const second = buildBudgetAlertReferenceId(projectId);

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('notifyBudgetAlert usa createIfAbsent com reference deduplicado', async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
    };
    usersRepository.createQueryBuilder.mockReturnValue(qb);
    notificationsService.createIfAbsent.mockResolvedValue({ id: 'n-1' });

    const project = new SocialProject();
    project.id = '11111111-2222-3333-4444-555555555555';
    project.congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
    project.name = 'Projeto Música';
    project.status = SocialProjectStatus.ACTIVE;
    project.budgetAmount = '1000.00';
    project.spentAmount = '850.00';

    await service.notifyBudgetAlert(project, 'actor-1');

    expect(notificationsService.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        referenceId: buildBudgetAlertReferenceId(project.id),
      }),
    );
  });

  it('dispatch exclui actorUserId dos destinatários', async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ id: 'actor-1' }, { id: 'user-2' }]),
    };
    usersRepository.createQueryBuilder.mockReturnValue(qb);
    notificationsService.createIfAbsent.mockResolvedValue({ id: 'n-1' });

    const project = new SocialProject();
    project.id = '11111111-2222-3333-4444-555555555555';
    project.congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
    project.name = 'Projeto';
    project.status = SocialProjectStatus.ACTIVE;
    project.budgetAmount = '1000.00';
    project.spentAmount = '900.00';

    await service.notifyBudgetAlert(project, 'actor-1');

    expect(notificationsService.createIfAbsent).toHaveBeenCalledTimes(1);
    expect(notificationsService.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
  });
});
