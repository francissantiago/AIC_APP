import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementsBoardResponseDto,
  PaginatedAnnouncementsResponseDto,
} from './dto/paginated-announcements-response.dto';
import { QueryAnnouncementsBoardDto } from './dto/query-announcements-board.dto';
import { QueryAnnouncementsDto } from './dto/query-announcements.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAudience } from './enums/announcement-audience.enum';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectRepository(Announcement)
    private readonly announcementsRepository: Repository<Announcement>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    author: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<AnnouncementResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    this.assertAudienceSupported(dto.audience);
    this.assertAudienceTargets(dto.audienceTargets);

    const title = dto.title.trim();
    const body = dto.body.trim();
    if (!title || !body) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_VALIDATION,
        message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
      });
    }

    const publishedAt = dto.publishedAt
      ? new Date(dto.publishedAt)
      : new Date();
    const expiresAt =
      dto.expiresAt === undefined || dto.expiresAt === null
        ? null
        : new Date(dto.expiresAt);
    this.assertExpiresAfterPublish(publishedAt, expiresAt);

    const announcement = this.announcementsRepository.create({
      congregationId,
      title,
      body,
      audience: AnnouncementAudience.ALL,
      audienceTargets: null,
      publishedAt,
      expiresAt,
      authorUserId: author.id,
    });

    const saved = await this.announcementsRepository.save(announcement);
    this.logger.log(`Aviso criado: ${saved.id}`);
    return this.toResponse(
      await this.getAnnouncementOrFail(saved.id, activeCongregationId),
    );
  }

  async findAll(
    query: QueryAnnouncementsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedAnnouncementsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, search, includeExpired } = query;
    const now = new Date();

    const qb = this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.congregationId = :congregationId', {
        congregationId,
      })
      .orderBy('announcement.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('announcement.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    if (!includeExpired) {
      qb.andWhere(
        '(announcement.expiresAt IS NULL OR announcement.expiresAt > :now)',
        { now },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items.map((item) => AnnouncementResponseDto.fromEntity(item, now)),
      total,
      page,
      limit,
    };
  }

  async findBoard(
    query: QueryAnnouncementsBoardDto,
    activeCongregationId?: string,
  ): Promise<AnnouncementsBoardResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const now = new Date();
    const limit = query.limit;

    const items = await this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.congregationId = :congregationId', {
        congregationId,
      })
      .andWhere('announcement.audience = :audience', {
        audience: AnnouncementAudience.ALL,
      })
      .andWhere('announcement.publishedAt <= :now', { now })
      .andWhere(
        '(announcement.expiresAt IS NULL OR announcement.expiresAt > :now)',
        { now },
      )
      .orderBy('announcement.publishedAt', 'DESC')
      .take(limit)
      .getMany();

    return {
      data: items.map((item) => AnnouncementResponseDto.fromEntity(item, now)),
    };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<AnnouncementResponseDto> {
    return this.toResponse(
      await this.getAnnouncementOrFail(id, activeCongregationId),
    );
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
    activeCongregationId?: string,
  ): Promise<AnnouncementResponseDto> {
    const announcement = await this.getAnnouncementOrFail(
      id,
      activeCongregationId,
    );

    if (dto.audience !== undefined) {
      this.assertAudienceSupported(dto.audience);
      announcement.audience = AnnouncementAudience.ALL;
    }
    if (dto.audienceTargets !== undefined) {
      this.assertAudienceTargets(dto.audienceTargets);
      announcement.audienceTargets = null;
    }

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new ApiException(HttpStatus.BAD_REQUEST, {
          code: ApiErrorCode.SYS_VALIDATION,
          message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
          details: [
            {
              field: 'title',
              code: ApiErrorCode.SYS_VALIDATION,
              message: 'Título é obrigatório.',
            },
          ],
        });
      }
      announcement.title = title;
    }

    if (dto.body !== undefined) {
      const body = dto.body.trim();
      if (!body) {
        throw new ApiException(HttpStatus.BAD_REQUEST, {
          code: ApiErrorCode.SYS_VALIDATION,
          message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
          details: [
            {
              field: 'body',
              code: ApiErrorCode.SYS_VALIDATION,
              message: 'Corpo é obrigatório.',
            },
          ],
        });
      }
      announcement.body = body;
    }

    if (dto.publishedAt !== undefined) {
      announcement.publishedAt = new Date(dto.publishedAt);
    }
    if (dto.expiresAt !== undefined) {
      announcement.expiresAt =
        dto.expiresAt === null ? null : new Date(dto.expiresAt);
    }

    this.assertExpiresAfterPublish(
      announcement.publishedAt,
      announcement.expiresAt,
    );

    const saved = await this.announcementsRepository.save(announcement);
    this.logger.log(`Aviso atualizado: ${saved.id}`);
    return this.toResponse(
      await this.getAnnouncementOrFail(saved.id, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const announcement = await this.getAnnouncementOrFail(
      id,
      activeCongregationId,
    );
    await this.announcementsRepository.softRemove(announcement);
    this.logger.log(`Aviso removido (soft delete): ${id}`);
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getAnnouncementOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<Announcement> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const announcement = await this.announcementsRepository.findOne({
      where: { id, congregationId },
      relations: { author: true },
    });
    if (!announcement) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.ANNOUNCEMENTS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.ANNOUNCEMENTS_NOT_FOUND],
      });
    }
    return announcement;
  }

  private assertAudienceSupported(
    audience: AnnouncementAudience | undefined,
  ): void {
    if (audience !== undefined && audience !== AnnouncementAudience.ALL) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED,
        message:
          ApiErrorMessage[ApiErrorCode.ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED],
        details: [
          {
            field: 'audience',
            code: ApiErrorCode.ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED,
            message:
              ApiErrorMessage[
                ApiErrorCode.ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED
              ],
          },
        ],
      });
    }
  }

  private assertAudienceTargets(targets: string[] | null | undefined): void {
    if (targets === undefined || targets === null) {
      return;
    }
    if (targets.length === 0) {
      return;
    }
    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
      code: ApiErrorCode.ANNOUNCEMENTS_INVALID_TARGETS,
      message: ApiErrorMessage[ApiErrorCode.ANNOUNCEMENTS_INVALID_TARGETS],
      details: [
        {
          field: 'audienceTargets',
          code: ApiErrorCode.ANNOUNCEMENTS_INVALID_TARGETS,
          message: ApiErrorMessage[ApiErrorCode.ANNOUNCEMENTS_INVALID_TARGETS],
        },
      ],
    });
  }

  private assertExpiresAfterPublish(
    publishedAt: Date,
    expiresAt: Date | null,
  ): void {
    if (expiresAt !== null && expiresAt.getTime() <= publishedAt.getTime()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH,
        message:
          ApiErrorMessage[ApiErrorCode.ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH],
        details: [
          {
            field: 'expiresAt',
            code: ApiErrorCode.ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH,
            message:
              ApiErrorMessage[
                ApiErrorCode.ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH
              ],
          },
        ],
      });
    }
  }

  private toResponse(announcement: Announcement): AnnouncementResponseDto {
    return AnnouncementResponseDto.fromEntity(announcement);
  }
}
