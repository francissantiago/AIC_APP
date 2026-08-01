import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { ConstructionNotificationsService } from './construction-notifications.service';
import { ConstructionProjectsService } from './construction-projects.service';
import { CreateConstructionUpdateDto } from './dto/create-construction-update.dto';
import {
  ConstructionUpdateResponseDto,
  PaginatedConstructionUpdatesResponseDto,
} from './dto/construction-update-response.dto';
import { QueryConstructionUpdatesDto } from './dto/query-construction-updates.dto';
import { UpdateConstructionUpdateDto } from './dto/update-construction-update.dto';
import { ConstructionUpdate } from './entities/construction-update.entity';

@Injectable()
export class ConstructionUpdatesService {
  private readonly logger = new Logger(ConstructionUpdatesService.name);

  constructor(
    @InjectRepository(ConstructionUpdate)
    private readonly updatesRepository: Repository<ConstructionUpdate>,
    private readonly congregationsService: CongregationsService,
    private readonly constructionProjectsService: ConstructionProjectsService,
    private readonly constructionNotificationsService: ConstructionNotificationsService,
  ) {}

  async create(
    dto: CreateConstructionUpdateDto,
    activeCongregationId?: string,
    actorUserId?: string,
  ): Promise<ConstructionUpdateResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const project =
      await this.constructionProjectsService.getProjectOrFailInternal(
        dto.constructionProjectId,
        congregationId,
      );

    const update = this.updatesRepository.create({
      congregationId,
      constructionProjectId: project.id,
      title: dto.title.trim(),
      description: this.nullableText(dto.description),
      progressPercent: project.progressPercent,
      recordedAt: dto.recordedAt,
    });
    const saved = await this.updatesRepository.save(update);

    await this.constructionNotificationsService.notifyUpdateCreated(
      saved,
      project,
      actorUserId,
    );

    this.logger.log(`Andamento de obra criado: ${saved.id}`);
    return ConstructionUpdateResponseDto.fromEntity(
      await this.getUpdateOrFail(saved.id, activeCongregationId),
    );
  }

  async findAll(
    query: QueryConstructionUpdatesDto,
    activeCongregationId?: string,
  ): Promise<PaginatedConstructionUpdatesResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, constructionProjectId } = query;

    const qb = this.updatesRepository
      .createQueryBuilder('update')
      .leftJoinAndSelect('update.constructionProject', 'project')
      .where('update.congregationId = :congregationId', { congregationId })
      .orderBy('update.recordedAt', 'DESC')
      .addOrderBy('update.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (constructionProjectId) {
      qb.andWhere('update.constructionProjectId = :constructionProjectId', {
        constructionProjectId,
      });
    }
    if (q) {
      qb.andWhere('(update.title LIKE :q OR update.description LIKE :q)', {
        q: `%${q}%`,
      });
    }

    const [updates, total] = await qb.getManyAndCount();
    return {
      data: updates.map((item) =>
        ConstructionUpdateResponseDto.fromEntity(item),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<ConstructionUpdateResponseDto> {
    return ConstructionUpdateResponseDto.fromEntity(
      await this.getUpdateOrFail(id, activeCongregationId),
    );
  }

  async update(
    id: string,
    dto: UpdateConstructionUpdateDto,
    activeCongregationId?: string,
  ): Promise<ConstructionUpdateResponseDto> {
    const update = await this.getUpdateOrFail(id, activeCongregationId);

    if (dto.title !== undefined) {
      update.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      update.description = this.nullableText(dto.description);
    }
    if (dto.recordedAt !== undefined) {
      update.recordedAt = dto.recordedAt;
    }

    const saved = await this.updatesRepository.save(update);
    this.logger.log(`Andamento de obra atualizado: ${saved.id}`);
    return ConstructionUpdateResponseDto.fromEntity(
      await this.getUpdateOrFail(saved.id, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const update = await this.getUpdateOrFail(id, activeCongregationId);
    await this.updatesRepository.softRemove(update);
    this.logger.log(`Andamento removido (soft delete): ${id}`);
  }

  async getUpdateOrFailInternal(
    id: string,
    congregationId: string,
  ): Promise<ConstructionUpdate> {
    const update = await this.updatesRepository.findOne({
      where: { id, congregationId },
    });
    if (!update) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_UPDATE_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_UPDATE_NOT_FOUND],
      });
    }
    return update;
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getUpdateOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<ConstructionUpdate> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const update = await this.updatesRepository.findOne({
      where: { id, congregationId },
      relations: { constructionProject: true },
    });
    if (!update) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_UPDATE_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_UPDATE_NOT_FOUND],
      });
    }
    return update;
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
