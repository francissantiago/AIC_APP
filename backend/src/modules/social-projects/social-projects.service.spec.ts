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
import { MemberStatus } from '../members/enums/member-status.enum';
import { SocialProjectMember } from './entities/social-project-member.entity';
import { SocialProjectSession } from './entities/social-project-session.entity';
import { SocialProject } from './entities/social-project.entity';
import { SocialProjectCategory } from './enums/social-project-category.enum';
import { SocialProjectMemberRole } from './enums/social-project-member-role.enum';
import { SocialProjectStatus } from './enums/social-project-status.enum';
import { SocialProjectNotificationsService } from './social-project-notifications.service';
import { SocialProjectsService } from './social-projects.service';

describe('SocialProjectsService', () => {
  let service: SocialProjectsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const projectId = '11111111-2222-3333-4444-555555555555';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

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
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const sessionsRepository = {
    count: jest.fn(),
  };
  const entriesRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const churchMembersRepository = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const socialProjectNotificationsService = {
    notifyStatusChange: jest.fn(),
    notifyBudgetAlert: jest.fn(),
    notifyParticipantAdded: jest.fn(),
  };

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = baseCongregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseProject = (overrides?: Partial<SocialProject>): SocialProject => {
    const project = new SocialProject();
    project.id = projectId;
    project.congregationId = baseCongregationId;
    project.name = 'Projeto Música';
    project.description = null;
    project.category = SocialProjectCategory.MUSIC;
    project.leaderMemberId = null;
    project.leaderMember = null;
    project.dayOfWeek = 0;
    project.startTime = null;
    project.location = null;
    project.budgetAmount = '1000.00';
    project.spentAmount = '0.00';
    project.status = SocialProjectStatus.ACTIVE;
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
        SocialProjectsService,
        {
          provide: getRepositoryToken(SocialProject),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(SocialProjectMember),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(SocialProjectSession),
          useValue: sessionsRepository,
        },
        {
          provide: getRepositoryToken(FinancialEntry),
          useValue: entriesRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: churchMembersRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
        {
          provide: SocialProjectNotificationsService,
          useValue: socialProjectNotificationsService,
        },
      ],
    }).compile();

    service = module.get(SocialProjectsService);
  });

  describe('create', () => {
    it('deve criar projeto social na congregação-base', async () => {
      projectsRepository.findOne.mockResolvedValue(null);
      const saved = baseProject();
      projectsRepository.create.mockReturnValue(saved);
      projectsRepository.save.mockResolvedValue(saved);
      projectsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);

      const result = await service.create({
        name: 'Projeto Música',
        category: SocialProjectCategory.MUSIC,
      });

      expect(result.name).toBe('Projeto Música');
      expect(result.congregationId).toBe(baseCongregationId);
    });

    it('deve lançar 409 NAME_CONFLICT para nome duplicado', async () => {
      projectsRepository.findOne.mockResolvedValue(baseProject());

      await expect(
        service.create({ name: 'Projeto Música' }),
      ).rejects.toBeInstanceOf(ApiException);

      try {
        await service.create({ name: 'Projeto Música' });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SOCIAL_PROJECTS_NAME_CONFLICT,
        });
      }
    });
  });

  describe('update', () => {
    it('deve notificar mudança de status', async () => {
      const project = baseProject();
      const updated = baseProject({ status: SocialProjectStatus.INACTIVE });
      projectsRepository.findOne
        .mockResolvedValueOnce(project)
        .mockResolvedValueOnce(updated);
      projectsRepository.save.mockResolvedValue(updated);

      await service.update(
        projectId,
        { status: SocialProjectStatus.INACTIVE },
        'actor-1',
      );

      expect(
        socialProjectNotificationsService.notifyStatusChange,
      ).toHaveBeenCalledWith(updated, SocialProjectStatus.ACTIVE, 'actor-1');
    });
  });

  describe('addMember', () => {
    it('deve sync líder quando role=leader', async () => {
      const project = baseProject();
      const member = new Member();
      member.id = memberId;
      member.congregationId = baseCongregationId;
      member.status = MemberStatus.ACTIVE;
      member.fullName = 'Maria';

      projectsRepository.findOne.mockResolvedValue(project);
      churchMembersRepository.findOne.mockResolvedValue(member);
      membersRepository.findOne.mockResolvedValue(null);
      const link = new SocialProjectMember();
      link.socialProjectId = projectId;
      link.memberId = memberId;
      link.role = SocialProjectMemberRole.LEADER;
      link.member = member;
      link.joinedAt = new Date();
      membersRepository.create.mockReturnValue(link);
      membersRepository.save.mockResolvedValue(link);
      projectsRepository.save.mockResolvedValue({
        ...project,
        leaderMemberId: memberId,
      });

      await service.addMember(
        projectId,
        { memberId, role: SocialProjectMemberRole.LEADER },
        'actor-1',
      );

      expect(projectsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ leaderMemberId: memberId }),
      );
      expect(
        socialProjectNotificationsService.notifyParticipantAdded,
      ).toHaveBeenCalled();
    });
  });

  describe('syncSpentAmount', () => {
    it('recalcula spent_amount a partir das despesas vinculadas', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '350.75' }),
      };
      entriesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.syncSpentAmount(projectId);

      expect(projectsRepository.update).toHaveBeenCalledWith(projectId, {
        spentAmount: '350.75',
      });
    });
  });
});
