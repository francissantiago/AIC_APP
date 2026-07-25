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
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateConstructionExpenseDto } from './dto/create-construction-expense.dto';
import {
  ConstructionExpenseResponseDto,
  PaginatedConstructionExpensesResponseDto,
} from './dto/construction-expense-response.dto';
import { ConstructionProjectsService } from './construction-projects.service';

const DEFAULT_CONSTRUCTION_CATEGORY_NAME = 'Obras';

@Injectable()
export class ConstructionExpensesService {
  private readonly logger = new Logger(ConstructionExpensesService.name);

  constructor(
    @InjectRepository(FinancialEntry)
    private readonly entriesRepository: Repository<FinancialEntry>,
    @InjectRepository(FinancialCategory)
    private readonly categoriesRepository: Repository<FinancialCategory>,
    private readonly constructionProjectsService: ConstructionProjectsService,
  ) {}

  async create(
    projectId: string,
    dto: CreateConstructionExpenseDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<ConstructionExpenseResponseDto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const category = await this.resolveCategory(congregationId, dto.categoryId);

    const entry = this.entriesRepository.create({
      congregationId,
      categoryId: category.id,
      createdByUserId: user.id,
      memberId: null,
      constructionProjectId: projectId,
      type: FinancialType.EXPENSE,
      amount: this.money(dto.amount),
      entryDate: dto.entryDate,
      description: dto.description.trim(),
      paymentMethod: dto.paymentMethod ?? PaymentMethod.OTHER,
      reference: `obra:${projectId}`,
      notes: this.nullableText(dto.notes),
    });
    const saved = await this.entriesRepository.save(entry);
    saved.category = category;

    await this.constructionProjectsService.syncSpentAmount(projectId);
    const project =
      await this.constructionProjectsService.getProjectOrFailInternal(
        projectId,
        congregationId,
      );
    await this.constructionProjectsService.checkBudgetAlert(project, user.id);

    this.logger.log(`Despesa de obra registrada: ${saved.id}`);
    return this.toDto(saved);
  }

  async findAll(
    projectId: string,
    page: number,
    limit: number,
    activeCongregationId?: string,
  ): Promise<PaginatedConstructionExpensesResponseDto> {
    const congregationId =
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const [entries, total] = await this.entriesRepository.findAndCount({
      where: {
        congregationId,
        constructionProjectId: projectId,
        type: FinancialType.EXPENSE,
      },
      relations: { category: true },
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
      await this.constructionProjectsService.getCongregationId(
        activeCongregationId,
      );
    await this.constructionProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    const entry = await this.entriesRepository.findOne({
      where: {
        id: entryId,
        congregationId,
        constructionProjectId: projectId,
        type: FinancialType.EXPENSE,
      },
    });
    if (!entry) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONSTRUCTIONS_EXPENSE_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_EXPENSE_NOT_FOUND],
      });
    }

    await this.entriesRepository.softRemove(entry);
    await this.constructionProjectsService.syncSpentAmount(projectId);
    const project =
      await this.constructionProjectsService.getProjectOrFailInternal(
        projectId,
        congregationId,
      );
    await this.constructionProjectsService.checkBudgetAlert(project, user.id);
    this.logger.log(`Despesa de obra removida: ${entryId}`);
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
          code: ApiErrorCode.CONSTRUCTIONS_CATEGORY_NOT_FOUND,
          message:
            ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_CATEGORY_NOT_FOUND],
        });
      }
      return category;
    }

    const category = await this.categoriesRepository.findOne({
      where: {
        congregationId,
        name: DEFAULT_CONSTRUCTION_CATEGORY_NAME,
        type: FinancialType.EXPENSE,
      },
    });
    if (!category) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONSTRUCTIONS_CATEGORY_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONSTRUCTIONS_CATEGORY_NOT_FOUND],
      });
    }
    return category;
  }

  private toDto(entry: FinancialEntry): ConstructionExpenseResponseDto {
    return {
      id: entry.id,
      congregationId: entry.congregationId,
      constructionProjectId: entry.constructionProjectId!,
      categoryId: entry.categoryId,
      categoryName: entry.category?.name ?? null,
      type: entry.type,
      amount: entry.amount,
      entryDate: entry.entryDate,
      description: entry.description,
      paymentMethod: entry.paymentMethod,
      reference: entry.reference,
      notes: entry.notes,
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
