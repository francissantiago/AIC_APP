import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { ConstructionProjectStageResponseDto } from './dto/construction-project-stage-response.dto';
import { CreateConstructionProjectStageDto } from './dto/create-construction-project-stage.dto';
import { UpdateConstructionProjectStageDto } from './dto/update-construction-project-stage.dto';
import { ConstructionProjectStage } from './entities/construction-project-stage.entity';
import { ConstructionProjectsService } from './construction-projects.service';

@Injectable()
export class ConstructionProjectStagesService {
  private readonly logger = new Logger(ConstructionProjectStagesService.name);

  constructor(
    @InjectRepository(ConstructionProjectStage)
    private readonly stagesRepository: Repository<ConstructionProjectStage>,
    private readonly constructionProjectsService: ConstructionProjectsService,
  ) {}

  list(
    projectId: string,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectStageResponseDto[]> {
    return this.findAll(projectId, activeCongregationId);
  }

  async findAll(
    projectId: string,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectStageResponseDto[]> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const stages = await this.stagesRepository.find({
      where: { constructionProjectId: projectId, congregationId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return stages.map((stage) =>
      ConstructionProjectStageResponseDto.fromEntity(stage),
    );
  }

  async create(
    projectId: string,
    dto: CreateConstructionProjectStageDto,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectStageResponseDto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const sortOrder = await this.stagesRepository.count({
      where: { constructionProjectId: projectId, congregationId },
    });

    const stage = this.stagesRepository.create({
      congregationId,
      constructionProjectId: projectId,
      title: dto.title.trim(),
      sortOrder,
      completedAt: null,
    });
    const saved = await this.stagesRepository.save(stage);
    await this.syncProgressPercent(projectId, congregationId);
    this.logger.log(`Etapa de obra criada: ${saved.id}`);
    return ConstructionProjectStageResponseDto.fromEntity(saved);
  }

  async update(
    projectId: string,
    stageId: string,
    dto: UpdateConstructionProjectStageDto,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectStageResponseDto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    const stage = await this.getStageOrFail(projectId, stageId, congregationId);

    if (dto.title !== undefined) {
      stage.title = dto.title.trim();
    }
    if (dto.completed !== undefined) {
      stage.completedAt = dto.completed ? new Date() : null;
    }

    const saved = await this.stagesRepository.save(stage);
    await this.syncProgressPercent(projectId, congregationId);
    return ConstructionProjectStageResponseDto.fromEntity(saved);
  }

  async remove(
    projectId: string,
    stageId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    const stage = await this.getStageOrFail(projectId, stageId, congregationId);
    await this.stagesRepository.softRemove(stage);
    await this.syncProgressPercent(projectId, congregationId);
    this.logger.log(`Etapa de obra removida: ${stageId}`);
  }

  async syncProgressPercent(
    projectId: string,
    congregationId: string,
  ): Promise<void> {
    const [total, completed] = await Promise.all([
      this.stagesRepository.count({
        where: { constructionProjectId: projectId, congregationId },
      }),
      this.stagesRepository
        .createQueryBuilder('stage')
        .where('stage.constructionProjectId = :projectId', { projectId })
        .andWhere('stage.congregationId = :congregationId', { congregationId })
        .andWhere('stage.completedAt IS NOT NULL')
        .andWhere('stage.deletedAt IS NULL')
        .getCount(),
    ]);

    const progressPercent =
      total === 0 ? 0 : Math.round((completed / total) * 100);
    await this.constructionProjectsService.updateProgress(
      projectId,
      congregationId,
      progressPercent,
    );
  }

  private async getStageOrFail(
    projectId: string,
    stageId: string,
    congregationId: string,
  ): Promise<ConstructionProjectStage> {
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    const stage = await this.stagesRepository.findOne({
      where: {
        id: stageId,
        constructionProjectId: projectId,
        congregationId,
      },
    });
    if (!stage) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_STAGE_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_STAGE_NOT_FOUND],
      });
    }
    return stage;
  }
}
