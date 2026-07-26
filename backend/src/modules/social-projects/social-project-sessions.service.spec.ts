import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { SocialProjectAttendance } from './entities/social-project-attendance.entity';
import { SocialProjectMember } from './entities/social-project-member.entity';
import { SocialProjectSession } from './entities/social-project-session.entity';
import { SocialProject } from './entities/social-project.entity';
import { SocialProjectNotificationsService } from './social-project-notifications.service';
import { SocialProjectSessionsService } from './social-project-sessions.service';
import { SocialProjectsService } from './social-projects.service';

describe('SocialProjectSessionsService', () => {
  let service: SocialProjectSessionsService;

  const projectId = '11111111-2222-3333-4444-555555555555';
  const sessionId = '22222222-3333-4444-5555-666666666666';
  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  const sessionsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const attendanceRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const socialProjectsService = {
    getCongregationId: jest.fn(),
    getProjectOrFailInternal: jest.fn(),
  };
  const socialProjectNotificationsService = {
    notifySessionCreated: jest.fn(),
  };

  const baseProject = (): SocialProject => {
    const project = new SocialProject();
    project.id = projectId;
    project.congregationId = congregationId;
    project.name = 'Projeto Esportes';
    return project;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    socialProjectsService.getCongregationId.mockResolvedValue(congregationId);
    socialProjectsService.getProjectOrFailInternal.mockResolvedValue(
      baseProject(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialProjectSessionsService,
        {
          provide: getRepositoryToken(SocialProjectSession),
          useValue: sessionsRepository,
        },
        {
          provide: getRepositoryToken(SocialProjectMember),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(SocialProjectAttendance),
          useValue: attendanceRepository,
        },
        { provide: SocialProjectsService, useValue: socialProjectsService },
        {
          provide: SocialProjectNotificationsService,
          useValue: socialProjectNotificationsService,
        },
      ],
    }).compile();

    service = module.get(SocialProjectSessionsService);
  });

  describe('create', () => {
    it('deve criar sessão e disparar notificação', async () => {
      sessionsRepository.findOne.mockResolvedValue(null);
      const session = new SocialProjectSession();
      session.id = sessionId;
      session.congregationId = congregationId;
      session.socialProjectId = projectId;
      session.sessionDate = '2026-07-26';
      session.title = 'Treino';
      session.theme = null;
      session.notes = null;
      session.location = null;
      session.createdAt = new Date();
      session.updatedAt = new Date();
      sessionsRepository.create.mockReturnValue(session);
      sessionsRepository.save.mockResolvedValue(session);

      const result = await service.create(
        projectId,
        {
          sessionDate: '2026-07-26',
          title: 'Treino',
        },
        'actor-1',
      );

      expect(result.title).toBe('Treino');
      expect(
        socialProjectNotificationsService.notifySessionCreated,
      ).toHaveBeenCalled();
    });

    it('deve lançar 409 SESSION_DATE_CONFLICT', async () => {
      const existing = new SocialProjectSession();
      existing.id = 'existing-session-id';
      sessionsRepository.findOne.mockResolvedValue(existing);

      await expect(
        service.create(projectId, {
          sessionDate: '2026-07-26',
          title: 'Treino',
        }),
      ).rejects.toBeInstanceOf(ApiException);

      try {
        await service.create(projectId, {
          sessionDate: '2026-07-26',
          title: 'Treino',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SOCIAL_PROJECTS_SESSION_DATE_CONFLICT,
        });
      }
    });
  });

  describe('upsertAttendance', () => {
    it('deve rejeitar membro que não é participante', async () => {
      const session = new SocialProjectSession();
      session.id = sessionId;
      session.socialProjectId = projectId;
      session.sessionDate = '2026-07-26';
      session.title = 'Treino';
      sessionsRepository.findOne.mockResolvedValue(session);
      membersRepository.find.mockResolvedValue([]);

      await expect(
        service.upsertAttendance(projectId, sessionId, {
          entries: [{ memberId, present: true }],
        }),
      ).rejects.toBeInstanceOf(ApiException);

      try {
        await service.upsertAttendance(projectId, sessionId, {
          entries: [{ memberId, present: true }],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SOCIAL_PROJECTS_ATTENDANCE_MEMBER_NOT_PARTICIPANT,
        });
      }
    });
  });
});
