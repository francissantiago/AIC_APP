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
import { AddSocialProjectMemberDto } from './dto/add-social-project-member.dto';
import { CreateSocialProjectDto } from './dto/create-social-project.dto';
import {
  PaginatedSocialProjectMembersResponseDto,
  SocialProjectMemberResponseDto,
} from './dto/social-project-member-response.dto';
import {
  PaginatedSocialProjectsResponseDto,
  SocialProjectResponseDto,
} from './dto/social-project-response.dto';
import { QuerySocialProjectMembersDto } from './dto/query-social-project-members.dto';
import { QuerySocialProjectsDto } from './dto/query-social-projects.dto';
import { UpdateSocialProjectMemberDto } from './dto/update-social-project-member.dto';
import { UpdateSocialProjectDto } from './dto/update-social-project.dto';
import { SocialProjectMember } from './entities/social-project-member.entity';
import { SocialProjectSession } from './entities/social-project-session.entity';
import { SocialProject } from './entities/social-project.entity';
import { SocialProjectMemberRole } from './enums/social-project-member-role.enum';
import { SocialProjectStatus } from './enums/social-project-status.enum';
import { SocialProjectNotificationsService } from './social-project-notifications.service';

const BUDGET_ALERT_THRESHOLD = 0.8;

@Injectable()
export class SocialProjectsService {
  private readonly logger = new Logger(SocialProjectsService.name);

  constructor(
    @InjectRepository(SocialProject)
    private readonly projectsRepository: Repository<SocialProject>,
    @InjectRepository(SocialProjectMember)
    private readonly membersRepository: Repository<SocialProjectMember>,
    @InjectRepository(SocialProjectSession)
    private readonly sessionsRepository: Repository<SocialProjectSession>,
    @InjectRepository(FinancialEntry)
    private readonly entriesRepository: Repository<FinancialEntry>,
    @InjectRepository(Member)
    private readonly churchMembersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    private readonly socialProjectNotificationsService: SocialProjectNotificationsService,
  ) {}

  async create(
    dto: CreateSocialProjectDto,
    activeCongregationId?: string,
  ): Promise<SocialProjectResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const name = dto.name.trim();
    await this.assertNameAvailable(congregationId, name);

    let leaderMemberId: string | null = null;
    if (dto.leaderMemberId) {
      await this.assertLeaderEligible(dto.leaderMemberId, congregationId);
      leaderMemberId = dto.leaderMemberId;
    }

    const project = this.projectsRepository.create({
      congregationId,
      name,
      description: this.nullableText(dto.description),
      category: dto.category,
      leaderMemberId,
      dayOfWeek: dto.dayOfWeek ?? 0,
      startTime: dto.startTime ?? null,
      location: this.nullableText(dto.location),
      budgetAmount:
        dto.budgetAmount !== undefined ? dto.budgetAmount.toFixed(2) : null,
      spentAmount: '0.00',
      status: dto.status ?? SocialProjectStatus.ACTIVE,
    });
    const saved = await this.projectsRepository.save(project);

    if (leaderMemberId) {
      await this.upsertLeaderLink(saved.id, leaderMemberId);
    }

    this.logger.log(`Projeto social criado: ${saved.id} (${saved.name})`);
    return this.toProjectResponse(
      await this.getProjectOrFail(saved.id, true, activeCongregationId),
    );
  }

  async findAll(
    query: QuerySocialProjectsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status, category } = query;

    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.leaderMember', 'leaderMember')
      .loadRelationCountAndMap('project.membersCount', 'project.members')
      .loadRelationCountAndMap('project.sessionsCount', 'project.sessions')
      .where('project.congregationId = :congregationId', { congregationId })
      .orderBy('project.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('project.status = :status', { status });
    }
    if (category) {
      qb.andWhere('project.category = :category', { category });
    }
    if (q) {
      qb.andWhere('project.name LIKE :q', { q: `%${q}%` });
    }

    const [projects, total] = await qb.getManyAndCount();
    const data = await Promise.all(
      projects.map(async (project) => {
        const expensesCount = await this.countExpenses(project.id);
        return SocialProjectResponseDto.fromEntity(project, {
          membersCount: (project as SocialProject & { membersCount?: number })
            .membersCount,
          sessionsCount: (project as SocialProject & { sessionsCount?: number })
            .sessionsCount,
          expensesCount,
        });
      }),
    );

    return { data, total, page, limit };
  }

  async findOne(
    id: string,
    options: {
      includeMembersCount?: boolean;
      includeSessionsCount?: boolean;
      includeExpensesCount?: boolean;
    } = {},
    activeCongregationId?: string,
  ): Promise<SocialProjectResponseDto> {
    const project = await this.getProjectOrFail(id, true, activeCongregationId);
    const response = this.toProjectResponse(project);

    if (options.includeMembersCount) {
      response.membersCount = await this.membersRepository.count({
        where: { socialProjectId: id },
      });
    }
    if (options.includeSessionsCount) {
      response.sessionsCount = await this.sessionsRepository.count({
        where: { socialProjectId: id },
      });
    }
    if (options.includeExpensesCount) {
      response.expensesCount = await this.countExpenses(id);
    }

    return response;
  }

  async update(
    id: string,
    dto: UpdateSocialProjectDto,
    actorUserId?: string,
    activeCongregationId?: string,
  ): Promise<SocialProjectResponseDto> {
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
    if (dto.category !== undefined) {
      project.category = dto.category;
    }
    if (dto.dayOfWeek !== undefined) {
      project.dayOfWeek = dto.dayOfWeek;
    }
    if (dto.startTime !== undefined) {
      project.startTime = dto.startTime ?? null;
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

    if (dto.leaderMemberId !== undefined) {
      if (dto.leaderMemberId === null || dto.leaderMemberId === '') {
        project.leaderMemberId = null;
      } else {
        await this.assertLeaderEligible(
          dto.leaderMemberId,
          project.congregationId,
        );
        project.leaderMemberId = dto.leaderMemberId;
        await this.upsertLeaderLink(project.id, dto.leaderMemberId);
      }
    }

    const saved = await this.projectsRepository.save(project);

    if (dto.status !== undefined && saved.status !== previousStatus) {
      await this.socialProjectNotificationsService.notifyStatusChange(
        saved,
        previousStatus,
        actorUserId,
      );
    }

    await this.checkBudgetAlert(saved, actorUserId);
    this.logger.log(`Projeto social atualizado: ${saved.id}`);
    return this.toProjectResponse(
      await this.getProjectOrFail(saved.id, true, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const project = await this.getProjectOrFail(id, true, activeCongregationId);
    await this.projectsRepository.softRemove(project);
    this.logger.log(`Projeto social removido (soft delete): ${id}`);
  }

  async findMembers(
    projectId: string,
    query: QuerySocialProjectMembersDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectMembersResponseDto> {
    await this.getProjectOrFail(projectId, true, activeCongregationId);
    const { page, limit, q, role } = query;

    const qb = this.membersRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.member', 'member')
      .where('link.socialProjectId = :projectId', { projectId })
      .orderBy('link.joinedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (role) {
      qb.andWhere('link.role = :role', { role });
    }
    if (q) {
      qb.andWhere('member.fullName LIKE :q', { q: `%${q}%` });
    }

    const [links, total] = await qb.getManyAndCount();
    return {
      data: links.map((link) =>
        SocialProjectMemberResponseDto.fromEntity(link),
      ),
      total,
      page,
      limit,
    };
  }

  async addMember(
    projectId: string,
    dto: AddSocialProjectMemberDto,
    actorUserId?: string,
    activeCongregationId?: string,
  ): Promise<SocialProjectMemberResponseDto> {
    const project = await this.getProjectOrFail(
      projectId,
      true,
      activeCongregationId,
    );
    const member = await this.assertMemberEligible(
      dto.memberId,
      project.congregationId,
    );

    const existing = await this.membersRepository.findOne({
      where: { socialProjectId: projectId, memberId: dto.memberId },
    });
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SOCIAL_PROJECTS_MEMBER_ALREADY_LINKED,
        message:
          ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_MEMBER_ALREADY_LINKED],
      });
    }

    const role = dto.role ?? SocialProjectMemberRole.PARTICIPANT;
    const link = this.membersRepository.create({
      socialProjectId: projectId,
      memberId: dto.memberId,
      role,
      joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
    });
    const saved = await this.membersRepository.save(link);

    if (role === SocialProjectMemberRole.LEADER) {
      project.leaderMemberId = dto.memberId;
      await this.projectsRepository.save(project);
    }

    saved.member = member;
    await this.socialProjectNotificationsService.notifyParticipantAdded(
      project,
      actorUserId,
    );

    this.logger.log(
      `Membro ${dto.memberId} vinculado ao projeto social ${projectId}`,
    );
    return SocialProjectMemberResponseDto.fromEntity(saved);
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    dto: UpdateSocialProjectMemberDto,
    activeCongregationId?: string,
  ): Promise<SocialProjectMemberResponseDto> {
    const project = await this.getProjectOrFail(
      projectId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(projectId, memberId);

    link.role = dto.role;
    const saved = await this.membersRepository.save(link);

    if (dto.role === SocialProjectMemberRole.LEADER) {
      project.leaderMemberId = memberId;
      await this.projectsRepository.save(project);
    } else if (project.leaderMemberId === memberId) {
      project.leaderMemberId = null;
      await this.projectsRepository.save(project);
    }

    if (!saved.member) {
      saved.member = await this.churchMembersRepository.findOneOrFail({
        where: { id: memberId },
      });
    }

    return SocialProjectMemberResponseDto.fromEntity(saved);
  }

  async removeMember(
    projectId: string,
    memberId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    const project = await this.getProjectOrFail(
      projectId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(projectId, memberId);

    await this.membersRepository.remove(link);

    if (project.leaderMemberId === memberId) {
      project.leaderMemberId = null;
      await this.projectsRepository.save(project);
    }

    this.logger.log(
      `Membro ${memberId} desvinculado do projeto social ${projectId}`,
    );
  }

  async getCongregationId(activeCongregationId?: string): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  async getProjectOrFailInternal(
    id: string,
    congregationId: string,
  ): Promise<SocialProject> {
    const project = await this.projectsRepository.findOne({
      where: { id, congregationId },
    });
    if (!project) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SOCIAL_PROJECTS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_NOT_FOUND],
      });
    }
    return project;
  }

  async syncSpentAmount(projectId: string): Promise<void> {
    const result = await this.entriesRepository
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.amount), 0)', 'total')
      .where('entry.socialProjectId = :projectId', { projectId })
      .andWhere('entry.type = :type', { type: FinancialType.EXPENSE })
      .andWhere('entry.deletedAt IS NULL')
      .getRawOne<{ total: string }>();

    const total = Number(result?.total ?? 0);
    await this.projectsRepository.update(projectId, {
      spentAmount: total.toFixed(2),
    });
  }

  async checkBudgetAlert(
    project: SocialProject,
    actorUserId?: string,
  ): Promise<void> {
    if (!project.budgetAmount) return;
    const budget = Number(project.budgetAmount);
    const spent = Number(project.spentAmount);
    if (!Number.isFinite(budget) || budget <= 0) return;
    if (spent / budget < BUDGET_ALERT_THRESHOLD) return;

    await this.socialProjectNotificationsService.notifyBudgetAlert(
      project,
      actorUserId,
    );
  }

  private async getProjectOrFail(
    id: string,
    withLeader = true,
    activeCongregationId?: string,
  ): Promise<SocialProject> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const project = await this.projectsRepository.findOne({
      where: { id, congregationId },
      relations: withLeader ? { leaderMember: true } : undefined,
    });
    if (!project) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SOCIAL_PROJECTS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_NOT_FOUND],
      });
    }
    return project;
  }

  private async getLinkOrFail(
    projectId: string,
    memberId: string,
  ): Promise<SocialProjectMember> {
    const link = await this.membersRepository.findOne({
      where: { socialProjectId: projectId, memberId },
      relations: { member: true },
    });
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SOCIAL_PROJECTS_MEMBER_LINK_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_MEMBER_LINK_NOT_FOUND],
      });
    }
    return link;
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
        code: ApiErrorCode.SOCIAL_PROJECTS_NAME_CONFLICT,
        message: ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_NAME_CONFLICT],
        details: [
          {
            field: 'name',
            code: ApiErrorCode.SOCIAL_PROJECTS_NAME_CONFLICT,
            message:
              ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_NAME_CONFLICT],
          },
        ],
      });
    }
  }

  private async assertLeaderEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.churchMembersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SOCIAL_PROJECTS_LEADER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_LEADER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SOCIAL_PROJECTS_LEADER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[
            ApiErrorCode.SOCIAL_PROJECTS_LEADER_WRONG_CONGREGATION
          ],
      });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SOCIAL_PROJECTS_LEADER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_LEADER_NOT_FOUND],
      });
    }
    return member;
  }

  private async assertMemberEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.churchMembersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SOCIAL_PROJECTS_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SOCIAL_PROJECTS_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[
            ApiErrorCode.SOCIAL_PROJECTS_MEMBER_WRONG_CONGREGATION
          ],
      });
    }
    return member;
  }

  private async upsertLeaderLink(
    projectId: string,
    memberId: string,
  ): Promise<void> {
    const existing = await this.membersRepository.findOne({
      where: { socialProjectId: projectId, memberId },
    });
    if (existing) {
      if (existing.role !== SocialProjectMemberRole.LEADER) {
        existing.role = SocialProjectMemberRole.LEADER;
        await this.membersRepository.save(existing);
      }
      return;
    }
    const link = this.membersRepository.create({
      socialProjectId: projectId,
      memberId,
      role: SocialProjectMemberRole.LEADER,
      joinedAt: new Date(),
    });
    await this.membersRepository.save(link);
  }

  private async countExpenses(projectId: string): Promise<number> {
    return this.entriesRepository.count({
      where: {
        socialProjectId: projectId,
        type: FinancialType.EXPENSE,
      },
    });
  }

  private toProjectResponse(project: SocialProject): SocialProjectResponseDto {
    return SocialProjectResponseDto.fromEntity(project);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
