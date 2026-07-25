import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { buildBudgetAlertReferenceId } from './construction-notification-refs';
import { ConstructionNotificationsService } from './construction-notifications.service';
import { ConstructionProject } from './entities/construction-project.entity';
import { ConstructionProjectStatus } from './enums/construction-project-status.enum';

describe('ConstructionNotificationsService', () => {
  let service: ConstructionNotificationsService;

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
        ConstructionNotificationsService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(ConstructionNotificationsService);
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

    const project = new ConstructionProject();
    project.id = '11111111-2222-3333-4444-555555555555';
    project.congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
    project.name = 'Reforma';
    project.status = ConstructionProjectStatus.IN_PROGRESS;
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
});
