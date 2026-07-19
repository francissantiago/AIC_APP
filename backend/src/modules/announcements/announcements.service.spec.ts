import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AnnouncementsService } from './announcements.service';
import { BIRTHDAY_BOARD_TITLE } from './birthday-board.util';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAudience } from './enums/announcement-audience.enum';
import { AnnouncementStatus } from './enums/announcement-status.enum';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const announcementId = '11111111-2222-3333-4444-555555555555';
  const authorUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  const announcementsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };

  const authorUser = (): UserResponseDto =>
    ({
      id: authorUserId,
      username: 'joao.silva',
      email: 'joao@igreja.org',
      fullName: 'João da Silva',
    }) as UserResponseDto;

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = baseCongregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseAnnouncement = (
    overrides?: Partial<Announcement>,
  ): Announcement => {
    const announcement = new Announcement();
    announcement.id = announcementId;
    announcement.congregationId = baseCongregationId;
    announcement.title = 'Aviso geral';
    announcement.body = 'Conteúdo do aviso';
    announcement.audience = AnnouncementAudience.ALL;
    announcement.audienceTargets = null;
    announcement.publishedAt = new Date('2026-07-01T12:00:00.000Z');
    announcement.expiresAt = null;
    announcement.authorUserId = authorUserId;
    announcement.author = {
      id: authorUserId,
      fullName: 'João da Silva',
    } as Announcement['author'];
    announcement.createdAt = new Date('2026-07-01T12:00:00.000Z');
    announcement.updatedAt = new Date('2026-07-01T12:00:00.000Z');
    announcement.deletedAt = null;
    Object.assign(announcement, overrides);
    return announcement;
  };

  const mockQueryBuilder = (
    items: Announcement[],
    total = items.length,
    existing: Announcement | null = null,
  ) => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([items, total]),
      getMany: jest.fn().mockResolvedValue(items),
      getOne: jest.fn().mockResolvedValue(existing),
    };
    announcementsRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: getRepositoryToken(Announcement),
          useValue: announcementsRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
      ],
    }).compile();

    service = module.get(AnnouncementsService);
  });

  describe('create', () => {
    it('deve criar com defaults (audience=all, publishedAt now, autor do user)', async () => {
      const saved = baseAnnouncement();
      announcementsRepository.create.mockReturnValue(saved);
      announcementsRepository.save.mockResolvedValue(saved);
      announcementsRepository.findOne.mockResolvedValue(saved);

      const before = Date.now();
      const result = await service.create(
        { title: 'Aviso geral', body: 'Conteúdo do aviso' },
        authorUser(),
      );
      const after = Date.now();

      expect(announcementsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          congregationId: baseCongregationId,
          audience: AnnouncementAudience.ALL,
          audienceTargets: null,
          authorUserId,
          title: 'Aviso geral',
          body: 'Conteúdo do aviso',
        }),
      );
      const createCalls = announcementsRepository.create.mock.calls as Array<
        [Partial<Announcement>]
      >;
      const createdArgs = createCalls[0][0];
      expect(createdArgs.publishedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(createdArgs.publishedAt!.getTime()).toBeLessThanOrEqual(after);
      expect(result.status).toBe(AnnouncementStatus.ACTIVE);
      expect(result.authorFullName).toBe('João da Silva');
    });

    it('deve lançar 422 AUDIENCE_NOT_SUPPORTED para audience=roles', async () => {
      try {
        await service.create(
          {
            title: 'Aviso',
            body: 'Corpo',
            audience: AnnouncementAudience.ROLES,
          },
          authorUser(),
        );
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED,
        });
      }
    });

    it('deve lançar 400 EXPIRES_BEFORE_PUBLISH quando expiresAt < publishedAt', async () => {
      try {
        await service.create(
          {
            title: 'Aviso',
            body: 'Corpo',
            publishedAt: '2026-07-10T12:00:00.000Z',
            expiresAt: '2026-07-09T12:00:00.000Z',
          },
          authorUser(),
        );
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.BAD_REQUEST,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH,
        });
      }
    });
  });

  describe('findBoard', () => {
    it('deve omitir agendados, expirados e soft-deleted (query de ativos)', async () => {
      const active = baseAnnouncement();
      const qb = mockQueryBuilder([active]);

      const result = await service.findBoard({ limit: 50 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'announcement.publishedAt <= :now',
        expect.objectContaining({ now: expect.any(Date) as Date }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(announcement.expiresAt IS NULL OR announcement.expiresAt > :now)',
        expect.objectContaining({ now: expect.any(Date) as Date }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'announcement.audience = :audience',
        { audience: AnnouncementAudience.ALL },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(AnnouncementStatus.ACTIVE);
    });
  });

  describe('remove', () => {
    it('deve soft delete e impedir retorno em findOne', async () => {
      const announcement = baseAnnouncement();
      announcementsRepository.findOne
        .mockResolvedValueOnce(announcement)
        .mockResolvedValueOnce(null);
      announcementsRepository.softRemove.mockResolvedValue(announcement);

      await service.remove(announcementId);

      expect(announcementsRepository.softRemove).toHaveBeenCalledWith(
        announcement,
      );

      try {
        await service.findOne(announcementId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.ANNOUNCEMENTS_NOT_FOUND,
        });
      }
    });
  });

  describe('findAll', () => {
    it('deve respeitar search e congregação', async () => {
      const item = baseAnnouncement({ title: 'Culto especial' });
      const qb = mockQueryBuilder([item]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        search: 'Culto',
        includeExpired: false,
      });

      expect(qb.where).toHaveBeenCalledWith(
        'announcement.congregationId = :congregationId',
        { congregationId: baseCongregationId },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'announcement.title LIKE :search',
        { search: '%Culto%' },
      );
      expect(result.data[0].title).toBe('Culto especial');
      expect(result.total).toBe(1);
    });
  });

  describe('contexto de congregação ativa', () => {
    it('findAll com activeCongregationId não chama getOrCreateBase', async () => {
      const explicitId = '22222222-3333-4444-5555-666666666666';
      const qb = mockQueryBuilder([]);
      jest.clearAllMocks();
      congregationsService.getOrCreateBase.mockResolvedValue(
        baseCongregation(),
      );

      await service.findAll({ page: 1, limit: 20 }, explicitId);

      expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        'announcement.congregationId = :congregationId',
        { congregationId: explicitId },
      );
    });
  });

  describe('upsertDailyBirthdayBoard', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-07-19T08:00:00-03:00') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve criar aviso no mural quando não existe publicação do dia', async () => {
      mockQueryBuilder([], 0, null);
      const saved = baseAnnouncement({
        title: BIRTHDAY_BOARD_TITLE,
        body: 'Juliana Bezerra Facre faz aniversário hoje (19/07).',
      });
      announcementsRepository.create.mockReturnValue(saved);
      announcementsRepository.save.mockResolvedValue(saved);

      const result = await service.upsertDailyBirthdayBoard(
        baseCongregationId,
        [{ fullName: 'Juliana Bezerra Facre', birthDate: '1945-07-19' }],
        authorUserId,
      );

      expect(result).toBe('created');
      expect(announcementsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          congregationId: baseCongregationId,
          title: BIRTHDAY_BOARD_TITLE,
          authorUserId,
          audience: AnnouncementAudience.ALL,
        }),
      );
    });

    it('deve atualizar aviso existente do dia', async () => {
      const existing = baseAnnouncement({
        title: BIRTHDAY_BOARD_TITLE,
        body: 'Corpo antigo',
      });
      mockQueryBuilder([], 0, existing);
      announcementsRepository.save.mockResolvedValue(existing);

      const result = await service.upsertDailyBirthdayBoard(
        baseCongregationId,
        [{ fullName: 'Juliana Bezerra Facre', birthDate: '1945-07-19' }],
        authorUserId,
      );

      expect(result).toBe('updated');
      expect(existing.body).toContain('Juliana Bezerra Facre');
      expect(announcementsRepository.save).toHaveBeenCalledWith(existing);
    });

    it('deve retornar unchanged quando corpo já está atualizado', async () => {
      const existing = baseAnnouncement({
        title: BIRTHDAY_BOARD_TITLE,
        body: 'Juliana Bezerra Facre faz aniversário hoje (19/07).',
      });
      mockQueryBuilder([], 0, existing);

      const result = await service.upsertDailyBirthdayBoard(
        baseCongregationId,
        [{ fullName: 'Juliana Bezerra Facre', birthDate: '1945-07-19' }],
        authorUserId,
      );

      expect(result).toBe('unchanged');
      expect(announcementsRepository.save).not.toHaveBeenCalled();
    });
  });
});
