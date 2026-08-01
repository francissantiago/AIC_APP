import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinancialType } from '../finance/enums/finance.enums';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { CreateConstructionProjectDto } from './dto/create-construction-project.dto';
import {
  ConstructionProjectResponseDto,
  PaginatedConstructionProjectsResponseDto,
} from './dto/construction-project-response.dto';
import { QueryConstructionProjectsDto } from './dto/query-construction-projects.dto';
import { UpdateConstructionProjectDto } from './dto/update-construction-project.dto';
import { ConstructionProject } from './entities/construction-project.entity';
import { ConstructionProjectStatus } from './enums/construction-project-status.enum';
import { ConstructionNotificationsService } from './construction-notifications.service';

const BUDGET_ALERT_THRESHOLD = 0.8;

@Injectable()
export class ConstructionProjectsService {
  private readonly logger = new Logger(ConstructionProjectsService.name);

  constructor(
    @InjectRepository(ConstructionProject)
    private readonly projectsRepository: Repository<ConstructionProject>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(FinancialEntry)
    private readonly entriesRepository: Repository<FinancialEntry>,
    private readonly congregationsService: CongregationsService,
    private readonly constructionNotificationsService: ConstructionNotificationsService,
  ) {}

  async create(
    dto: CreateConstructionProjectDto,
    actorUserId: string,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const name = dto.name.trim();
    await this.assertNameAvailable(congregationId, name);

    let supervisorMemberId: string | null = null;
    if (dto.supervisorMemberId) {
      await this.assertSupervisorEligible(
        dto.supervisorMemberId,
        congregationId,
      );
      supervisorMemberId = dto.supervisorMemberId;
    }

    const project = this.projectsRepository.create({
      congregationId,
      name,
      description: this.nullableText(dto.description),
      location: this.nullableText(dto.location),
      status: dto.status ?? ConstructionProjectStatus.PLANNING,
      progressPercent: 0,
      budgetAmount:
        dto.budgetAmount !== undefined ? dto.budgetAmount.toFixed(2) : null,
      spentAmount: '0.00',
      startDate: dto.startDate ?? null,
      expectedEndDate: dto.expectedEndDate ?? null,
      actualEndDate: dto.actualEndDate ?? null,
      supervisorMemberId,
    });
    const saved = await this.projectsRepository.save(project);
    this.logger.log(`Obra criada: ${saved.id} (${saved.name})`);
    return ConstructionProjectResponseDto.fromEntity(
      await this.getProjectOrFail(saved.id, true, activeCongregationId),
    );
  }

  async findAll(
    query: QueryConstructionProjectsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedConstructionProjectsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status } = query;

    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisorMember', 'supervisorMember')
      .loadRelationCountAndMap('project.updatesCount', 'project.updates')
      .loadRelationCountAndMap('project.photosCount', 'project.photos')
      .where('project.congregationId = :congregationId', { congregationId })
      .orderBy('project.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('project.status = :status', { status });
    }
    if (q) {
      qb.andWhere(
        '(project.name LIKE :q OR project.location LIKE :q OR project.description LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const [projects, total] = await qb.getManyAndCount();
    return {
      data: projects.map((project) =>
        ConstructionProjectResponseDto.fromEntity(project, {
          updatesCount: (
            project as ConstructionProject & { updatesCount?: number }
          ).updatesCount,
          photosCount: (
            project as ConstructionProject & { photosCount?: number }
          ).photosCount,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectResponseDto> {
    const project = await this.getProjectOrFail(id, true, activeCongregationId);
    return ConstructionProjectResponseDto.fromEntity(project);
  }

  async update(
    id: string,
    dto: UpdateConstructionProjectDto,
    actorUserId: string,
    activeCongregationId?: string,
  ): Promise<ConstructionProjectResponseDto> {
    const project = await this.getProjectOrFail(id, true, activeCongregationId);
    const previousStatus = project.status;

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== project.name) {
        await this.assertNameAvailable(project.congregationId, name, id);
      }
      project.name = name;
    }
    if (dto.description !== undefined) {
      project.description = this.nullableText(dto.description);
    }
    if (dto.location !== undefined) {
      project.location = this.nullableText(dto.location);
    }
    if (dto.status !== undefined) {
      project.status = dto.status;
    }
    if (dto.budgetAmount !== undefined) {
      project.budgetAmount =
        dto.budgetAmount === null ? null : dto.budgetAmount.toFixed(2);
    }
    if (dto.startDate !== undefined) {
      project.startDate = dto.startDate ?? null;
    }
    if (dto.expectedEndDate !== undefined) {
      project.expectedEndDate = dto.expectedEndDate ?? null;
    }
    if (dto.actualEndDate !== undefined) {
      project.actualEndDate = dto.actualEndDate ?? null;
    }
    if (dto.supervisorMemberId !== undefined) {
      if (!dto.supervisorMemberId) {
        project.supervisorMemberId = null;
      } else {
        await this.assertSupervisorEligible(
          dto.supervisorMemberId,
          project.congregationId,
        );
        project.supervisorMemberId = dto.supervisorMemberId;
      }
    }

    const saved = await this.projectsRepository.save(project);

    if (dto.status !== undefined && saved.status !== previousStatus) {
      await this.constructionNotificationsService.notifyStatusChange(
        saved,
        previousStatus,
        actorUserId,
      );
    }

    await this.checkBudgetAlert(saved, actorUserId);
    this.logger.log(`Obra atualizada: ${saved.id}`);
    return ConstructionProjectResponseDto.fromEntity(
      await this.getProjectOrFail(saved.id, true, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const project = await this.getProjectOrFail(id, true, activeCongregationId);
    await this.projectsRepository.softRemove(project);
    this.logger.log(`Obra removida (soft delete): ${id}`);
  }

  async getProjectOrFailInternal(
    id: string,
    congregationId: string,
  ): Promise<ConstructionProject> {
    const project = await this.projectsRepository.findOne({
      where: { id, congregationId },
    });
    if (!project) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_PROJECT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_PROJECT_NOT_FOUND],
      });
    }
    return project;
  }

  async getCongregationId(activeCongregationId?: string): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  async syncSpentAmount(projectId: string): Promise<void> {
    const result = await this.entriesRepository
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.amount), 0)', 'total')
      .where('entry.constructionProjectId = :projectId', { projectId })
      .andWhere('entry.type = :type', { type: FinancialType.EXPENSE })
      .andWhere('entry.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    const total = Number(result?.total ?? 0);
    await this.projectsRepository.update(projectId, {
      spentAmount: total.toFixed(2),
    });
  }

  async checkBudgetAlert(
    project: ConstructionProject,
    actorUserId?: string,
  ): Promise<void> {
    if (!project.budgetAmount) return;
    const budget = Number(project.budgetAmount);
    const spent = Number(project.spentAmount);
    if (!Number.isFinite(budget) || budget <= 0) return;
    const ratio = spent / budget;
    if (ratio < BUDGET_ALERT_THRESHOLD) return;

    await this.constructionNotificationsService.notifyBudgetAlert(
      project,
      actorUserId,
    );
  }

  async updateProgress(
    projectId: string,
    congregationId: string,
    progressPercent: number,
  ): Promise<void> {
    const project = await this.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    this.assertProgressPercent(progressPercent);
    project.progressPercent = progressPercent;
    await this.projectsRepository.save(project);
  }

  private async getProjectOrFail(
    id: string,
    withRelations = true,
    activeCongregationId?: string,
  ): Promise<ConstructionProject> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const project = await this.projectsRepository.findOne({
      where: { id, congregationId },
      relations: withRelations ? { supervisorMember: true } : undefined,
    });
    if (!project) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_PROJECT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_PROJECT_NOT_FOUND],
      });
    }
    return project;
  }

  private async assertNameAvailable(
    congregationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.projectsRepository.findOne({
      where: { congregationId, name },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.CONSTRUCTIONS_PROJECT_NAME_IN_USE,
        message:
          ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_PROJECT_NAME_IN_USE],
      });
    }
  }

  private async assertSupervisorEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONSTRUCTIONS_SUPERVISOR_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_SUPERVISOR_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONSTRUCTIONS_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_MEMBER_WRONG_CONGREGATION],
      });
    }
    return member;
  }

  private assertProgressPercent(value: number): void {
    if (value < 0 || value > 100) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.CONSTRUCTIONS_INVALID_PROGRESS,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_INVALID_PROGRESS],
      });
    }
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
