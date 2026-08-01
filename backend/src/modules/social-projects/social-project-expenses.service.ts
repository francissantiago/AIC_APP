import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinancialType, PaymentMethod } from '../finance/enums/finance.enums';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateSocialProjectExpenseDto } from './dto/create-social-project-expense.dto';
import {
  PaginatedSocialProjectExpensesResponseDto,
  SocialProjectExpenseResponseDto,
} from './dto/social-project-expense-response.dto';
import { SocialProjectsService } from './social-projects.service';

const DEFAULT_SOCIAL_CATEGORY_NAME = 'Ação social';

@Injectable()
export class SocialProjectExpensesService {
  private readonly logger = new Logger(SocialProjectExpensesService.name);

  constructor(
    @InjectRepository(FinancialEntry)
    private readonly entriesRepository: Repository<FinancialEntry>,
    @InjectRepository(FinancialCategory)
    private readonly categoriesRepository: Repository<FinancialCategory>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly socialProjectsService: SocialProjectsService,
  ) {}

  async create(
    projectId: string,
    dto: CreateSocialProjectExpenseDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<SocialProjectExpenseResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const category = await this.resolveCategory(congregationId, dto.categoryId);

    let memberId: string | null = null;
    let member: Member | null = null;
    if (dto.memberId) {
      member = await this.assertMemberEligible(dto.memberId, congregationId);
      memberId = member.id;
    }

    const entry = this.entriesRepository.create({
      congregationId,
      categoryId: category.id,
      createdByUserId: user.id,
      memberId,
      socialProjectId: projectId,
      type: FinancialType.EXPENSE,
      amount: this.money(dto.amount),
      entryDate: dto.entryDate,
      description: dto.description.trim(),
      paymentMethod: dto.paymentMethod ?? PaymentMethod.OTHER,
      reference: `social-project:${projectId}`,
      notes: this.nullableText(dto.notes),
    });
    const saved = await this.entriesRepository.save(entry);

    const loaded = await this.entriesRepository.findOneOrFail({
      where: { id: saved.id },
      relations: { category: true, member: true, createdByUser: true },
    });

    await this.socialProjectsService.syncSpentAmount(projectId);
    const project = await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    await this.socialProjectsService.checkBudgetAlert(project, user.id);

    this.logger.log(`Despesa de projeto social registrada: ${loaded.id}`);
    return this.toDto(loaded);
  }

  async findAll(
    projectId: string,
    page: number,
    limit: number,
    activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectExpensesResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const [entries, total] = await this.entriesRepository.findAndCount({
      where: {
        congregationId,
        socialProjectId: projectId,
        type: FinancialType.EXPENSE,
      },
      relations: { category: true, member: true, createdByUser: true },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: entries.map((entry) => this.toDto(entry)),
      total,
      page,
      limit,
    };
  }

  async remove(
    projectId: string,
    entryId: string,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<void> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const entry = await this.entriesRepository.findOne({
      where: {
        id: entryId,
        congregationId,
        socialProjectId: projectId,
        type: FinancialType.EXPENSE,
      },
    });
    if (!entry) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SOCIAL_PROJECTS_EXPENSE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_EXPENSE_NOT_FOUND],
      });
    }

    await this.entriesRepository.softRemove(entry);
    await this.socialProjectsService.syncSpentAmount(projectId);
    const project = await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    await this.socialProjectsService.checkBudgetAlert(project, user.id);
    this.logger.log(`Despesa de projeto social removida: ${entryId}`);
  }

  private async assertMemberEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }
    return member;
  }

  private async resolveCategory(
    congregationId: string,
    categoryId?: string,
  ): Promise<FinancialCategory> {
    if (categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: categoryId, congregationId, type: FinancialType.EXPENSE },
      });
      if (!category) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.SOCIAL_PROJECTS_CATEGORY_NOT_FOUND,
          message:
            ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_CATEGORY_NOT_FOUND],
        });
      }
      return category;
    }

    const category = await this.categoriesRepository.findOne({
      where: {
        congregationId,
        name: DEFAULT_SOCIAL_CATEGORY_NAME,
        type: FinancialType.EXPENSE,
      },
    });
    if (!category) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SOCIAL_PROJECTS_CATEGORY_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_CATEGORY_NOT_FOUND],
      });
    }
    return category;
  }

  private toDto(entry: FinancialEntry): SocialProjectExpenseResponseDto {
    return {
      id: entry.id,
      congregationId: entry.congregationId,
      socialProjectId: entry.socialProjectId!,
      categoryId: entry.categoryId,
      categoryName: entry.category?.name ?? null,
      type: entry.type,
      amount: entry.amount,
      entryDate: entry.entryDate,
      description: entry.description,
      paymentMethod: entry.paymentMethod,
      reference: entry.reference,
      notes: entry.notes,
      member: entry.member
        ? { id: entry.member.id, fullName: entry.member.fullName }
        : null,
      createdBy: entry.createdByUser
        ? { id: entry.createdByUser.id, fullName: entry.createdByUser.fullName }
        : null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
