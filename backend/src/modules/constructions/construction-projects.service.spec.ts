import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { Member } from '../members/entities/member.entity';
import { ConstructionNotificationsService } from './construction-notifications.service';
import { ConstructionProjectsService } from './construction-projects.service';
import { ConstructionProject } from './entities/construction-project.entity';
import { ConstructionProjectStatus } from './enums/construction-project-status.enum';

describe('ConstructionProjectsService', () => {
  let service: ConstructionProjectsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const projectId = '11111111-2222-3333-4444-555555555555';

  const projectsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const entriesRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const constructionNotificationsService = {
    notifyStatusChange: jest.fn(),
    notifyBudgetAlert: jest.fn(),
  };

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = baseCongregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseProject = (
    overrides?: Partial<ConstructionProject>,
  ): ConstructionProject => {
    const project = new ConstructionProject();
    project.id = projectId;
    project.congregationId = baseCongregationId;
    project.name = 'Reforma do templo';
    project.description = null;
    project.location = null;
    project.status = ConstructionProjectStatus.PLANNING;
    project.progressPercent = 0;
    project.budgetAmount = '10000.00';
    project.spentAmount = '0.00';
    project.startDate = null;
    project.expectedEndDate = null;
    project.actualEndDate = null;
    project.supervisorMemberId = null;
    project.createdAt = new Date('2026-07-18T00:00:00Z');
    project.updatedAt = new Date('2026-07-18T00:00:00Z');
    project.deletedAt = null;
    Object.assign(project, overrides);
    return project;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructionProjectsService,
        {
          provide: getRepositoryToken(ConstructionProject),
          useValue: projectsRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        {
          provide: getRepositoryToken(FinancialEntry),
          useValue: entriesRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
        {
          provide: ConstructionNotificationsService,
          useValue: constructionNotificationsService,
        },
      ],
    }).compile();

    service = module.get(ConstructionProjectsService);
  });

  describe('syncSpentAmount', () => {
    it('recalcula spent_amount a partir das despesas vinculadas', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '2500.50' }),
      };
      entriesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.syncSpentAmount(projectId);

      expect(projectsRepository.update).toHaveBeenCalledWith(projectId, {
        spentAmount: '2500.50',
      });
    });
  });

  describe('getProjectOrFailInternal', () => {
    it('lança CONSTRUCTIONS.PROJECT_NOT_FOUND quando obra não existe', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getProjectOrFailInternal(projectId, baseCongregationId),
      ).rejects.toBeInstanceOf(ApiException);

      try {
        await service.getProjectOrFailInternal(projectId, baseCongregationId);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ApiException);
        const apiError = error as ApiException;
        expect(apiError.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(apiError.getResponse()).toMatchObject({
          code: ApiErrorCode.CONSTRUCTIONS_PROJECT_NOT_FOUND,
        });
      }
    });
  });

  describe('checkBudgetAlert', () => {
    it('notifica quando gasto atinge 80% do orçamento', async () => {
      const project = baseProject({
        budgetAmount: '1000.00',
        spentAmount: '850.00',
      });

      await service.checkBudgetAlert(project, 'user-1');

      expect(
        constructionNotificationsService.notifyBudgetAlert,
      ).toHaveBeenCalledWith(project, 'user-1');
    });

    it('não notifica abaixo de 80%', async () => {
      const project = baseProject({
        budgetAmount: '1000.00',
        spentAmount: '500.00',
      });

      await service.checkBudgetAlert(project, 'user-1');

      expect(
        constructionNotificationsService.notifyBudgetAlert,
      ).not.toHaveBeenCalled();
    });
  });
});
