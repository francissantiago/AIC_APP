import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { AssetsService } from '../assets/assets.service';
import { CongregationsService } from '../congregations/congregations.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import {
  CashFlowCsvQueryDto,
  CashFlowQueryDto,
  CashFlowReportResponseDto,
  CreateFinancialCategoryDto,
  CreateFinancialEntryDto,
  ExpenseByCategoryDto,
  FinanceMemberOptionDto,
  FinanceMemberOptionsQueryDto,
  FinancialCategoryResponseDto,
  FinancialDashboardResponseDto,
  FinancialEntryResponseDto,
  MemberContributionsCsvQueryDto,
  MemberContributionsQueryDto,
  MemberContributionsReportDto,
  PaginatedFinancialEntriesResponseDto,
  PeriodQueryDto,
  QueryFinancialCategoriesDto,
  QueryFinancialEntriesDto,
  UpdateFinancialCategoryDto,
  UpdateFinancialEntryDto,
} from './dto/finance.dto';
import { FinancialCategory } from './entities/financial-category.entity';
import { FinancialEntry } from './entities/financial-entry.entity';
import { FinancialType } from './enums/finance.enums';

const DEFAULT_CATEGORIES: ReadonlyArray<readonly [string, FinancialType]> = [
  ['Dízimos', FinancialType.INCOME],
  ['Ofertas', FinancialType.INCOME],
  ['Doações', FinancialType.INCOME],
  ['Outros', FinancialType.INCOME],
  ['Água', FinancialType.EXPENSE],
  ['Energia', FinancialType.EXPENSE],
  ['Aluguel', FinancialType.EXPENSE],
  ['Manutenção', FinancialType.EXPENSE],
  ['Ação social', FinancialType.EXPENSE],
  ['Outros', FinancialType.EXPENSE],
];

const MEMBER_LINKABLE_CATEGORY_NAMES = [
  'Dízimos',
  'Ofertas',
  'Doações',
] as const;

type TotalRow = { income: string | null; expense: string | null };

type ContributionTotalsRow = {
  total: string | null;
  tithesTotal: string | null;
  offeringsTotal: string | null;
  donationsTotal: string | null;
  entriesCount: string | null;
};

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(FinancialCategory)
    private readonly categoriesRepository: Repository<FinancialCategory>,
    @InjectRepository(FinancialEntry)
    private readonly entriesRepository: Repository<FinancialEntry>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    private readonly assetsService: AssetsService,
  ) {}

  async findCategories(
    query: QueryFinancialCategoriesDto,
  ): Promise<FinancialCategoryResponseDto[]> {
    const congregationId = await this.getCongregationId();
    const qb = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.congregationId = :congregationId', { congregationId })
      .orderBy('category.type', 'ASC')
      .addOrderBy('category.name', 'ASC');
    if (query.type) {
      qb.andWhere('category.type = :type', { type: query.type });
    }
    if (query.active !== undefined) {
      qb.andWhere('category.active = :active', { active: query.active });
    }
    return (await qb.getMany()).map(this.toCategoryDto);
  }

  async createCategory(
    dto: CreateFinancialCategoryDto,
  ): Promise<FinancialCategoryResponseDto> {
    const congregationId = await this.getCongregationId();
    const category = this.categoriesRepository.create({
      congregationId,
      name: dto.name.trim(),
      type: dto.type,
      active: true,
      isDefault: false,
    });
    try {
      return this.toCategoryDto(await this.categoriesRepository.save(category));
    } catch (error) {
      this.rethrowCategoryDuplicate(error);
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateFinancialCategoryDto,
  ): Promise<FinancialCategoryResponseDto> {
    const congregationId = await this.getCongregationId();
    const category = await this.getCategoryOrFail(id, congregationId);
    if (dto.type && dto.type !== category.type) {
      const used = await this.entriesRepository
        .createQueryBuilder('entry')
        .withDeleted()
        .where('entry.categoryId = :id', { id })
        .getCount();
      if (used > 0) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.FINANCE_CATEGORY_TYPE_LOCKED,
          message: ApiErrorMessage[ApiErrorCode.FINANCE_CATEGORY_TYPE_LOCKED],
        });
      }
      category.type = dto.type;
    }
    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.active !== undefined) category.active = dto.active;
    try {
      return this.toCategoryDto(await this.categoriesRepository.save(category));
    } catch (error) {
      this.rethrowCategoryDuplicate(error);
    }
  }

  async createEntry(
    dto: CreateFinancialEntryDto,
    user: UserResponseDto,
  ): Promise<FinancialEntryResponseDto> {
    const congregationId = await this.getCongregationId();
    const category = await this.validateCategory(
      dto.categoryId,
      dto.type,
      congregationId,
      true,
    );
    const member = await this.assertMemberLinkAllowed(
      dto.memberId,
      dto.type,
      category,
      congregationId,
    );
    const entry = this.entriesRepository.create({
      congregationId,
      categoryId: category.id,
      createdByUserId: user.id,
      memberId: member?.id ?? null,
      type: dto.type,
      amount: this.money(dto.amount),
      entryDate: dto.entryDate,
      description: dto.description.trim(),
      paymentMethod: dto.paymentMethod,
      reference: this.nullableText(dto.reference),
      notes: this.nullableText(dto.notes),
    });
    const saved = await this.entriesRepository.save(entry);
    saved.category = category;
    saved.member = member;
    return this.toEntryDto(saved);
  }

  async findEntries(
    query: QueryFinancialEntriesDto,
  ): Promise<PaginatedFinancialEntriesResponseDto> {
    this.validateOptionalPeriod(query.from, query.to);
    const congregationId = await this.getCongregationId();
    const qb = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.category', 'category')
      .leftJoinAndSelect('entry.member', 'member')
      .where('entry.congregationId = :congregationId', { congregationId });
    this.applyEntryFilters(qb, query);
    qb.orderBy('entry.entryDate', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [entries, total] = await qb.getManyAndCount();
    return {
      data: entries.map(this.toEntryDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findEntry(id: string): Promise<FinancialEntryResponseDto> {
    const congregationId = await this.getCongregationId();
    return this.toEntryDto(await this.getEntryOrFail(id, congregationId));
  }

  async updateEntry(
    id: string,
    dto: UpdateFinancialEntryDto,
  ): Promise<FinancialEntryResponseDto> {
    const congregationId = await this.getCongregationId();
    const entry = await this.getEntryOrFail(id, congregationId);
    const nextType = dto.type ?? entry.type;
    const nextCategoryId = dto.categoryId ?? entry.categoryId;
    if (dto.type !== undefined || dto.categoryId !== undefined) {
      entry.category = await this.validateCategory(
        nextCategoryId,
        nextType,
        congregationId,
        nextCategoryId !== entry.categoryId,
      );
      entry.categoryId = nextCategoryId;
      entry.type = nextType;
    }
    if (dto.entryDate !== undefined) entry.entryDate = dto.entryDate;
    if (dto.description !== undefined)
      entry.description = dto.description.trim();
    if (dto.amount !== undefined) entry.amount = this.money(dto.amount);
    if (dto.paymentMethod !== undefined)
      entry.paymentMethod = dto.paymentMethod;
    if (dto.reference !== undefined) {
      entry.reference = this.nullableText(dto.reference);
    }
    if (dto.notes !== undefined) entry.notes = this.nullableText(dto.notes);

    const nextMemberId =
      dto.memberId !== undefined ? dto.memberId : entry.memberId;
    if (
      dto.memberId !== undefined ||
      dto.type !== undefined ||
      dto.categoryId !== undefined
    ) {
      if (nextMemberId) {
        entry.member = await this.assertMemberLinkAllowed(
          nextMemberId,
          nextType,
          entry.category,
          congregationId,
        );
        entry.memberId = nextMemberId;
      } else {
        entry.memberId = null;
        entry.member = null;
      }
    }

    return this.toEntryDto(await this.entriesRepository.save(entry));
  }

  async removeEntry(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.entriesRepository.softRemove(
      await this.getEntryOrFail(id, congregationId),
    );
    this.logger.log(`Lançamento removido (soft delete): ${id}`);
  }

  async getDashboard(
    query: PeriodQueryDto,
  ): Promise<FinancialDashboardResponseDto> {
    const period = this.resolvePeriod(query.from, query.to);
    const congregationId = await this.getCongregationId();
    const totals = await this.getEntryTotals(
      congregationId,
      period.from,
      period.to,
    );
    const assetTotals =
      await this.assetsService.getDashboardTotals(congregationId);
    const sixMonthStart = new Date(`${period.to}T00:00:00.000Z`);
    sixMonthStart.setUTCMonth(sixMonthStart.getUTCMonth() - 5, 1);
    const monthlyFrom = [
      period.from,
      sixMonthStart.toISOString().slice(0, 10),
    ].sort()[1];
    const monthlyRows = await this.entriesRepository
      .createQueryBuilder('entry')
      .select("DATE_FORMAT(entry.entryDate, '%Y-%m')", 'month')
      .addSelect(
        "SUM(CASE WHEN entry.type = 'income' THEN entry.amount ELSE 0 END)",
        'income',
      )
      .addSelect(
        "SUM(CASE WHEN entry.type = 'expense' THEN entry.amount ELSE 0 END)",
        'expense',
      )
      .where('entry.congregationId = :congregationId', { congregationId })
      .andWhere('entry.entryDate BETWEEN :from AND :to', {
        from: monthlyFrom,
        to: period.to,
      })
      .groupBy("DATE_FORMAT(entry.entryDate, '%Y-%m')")
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; income: string; expense: string }>();
    const categoryRows = await this.entriesRepository
      .createQueryBuilder('entry')
      .innerJoin('entry.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(entry.amount)', 'amount')
      .where('entry.congregationId = :congregationId', { congregationId })
      .andWhere('entry.type = :type', { type: FinancialType.EXPENSE })
      .andWhere('entry.entryDate BETWEEN :from AND :to', period)
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('amount', 'DESC')
      .getRawMany<{
        categoryId: string;
        categoryName: string;
        amount: string;
      }>();
    const visibleCategoryCount = categoryRows.length > 8 ? 7 : 8;
    const top: ExpenseByCategoryDto[] = categoryRows
      .slice(0, visibleCategoryCount)
      .map((row) => ({
        ...row,
        amount: this.money(row.amount),
      }));
    if (categoryRows.length > 8) {
      top.push({
        categoryId: null,
        categoryName: 'Outros',
        amount: this.money(
          categoryRows
            .slice(visibleCategoryCount)
            .reduce((sum, row) => sum + this.toCents(row.amount), 0n),
        ),
      });
    }
    return {
      period,
      totals: {
        income: this.money(totals.income),
        expense: this.money(totals.expense),
        balance: this.subtractMoney(totals.income, totals.expense),
        activeAssets: assetTotals.activeAssets,
        estimatedAssetValue: assetTotals.estimatedAssetValue,
      },
      monthly: monthlyRows.map((row) => ({
        month: row.month,
        income: this.money(row.income),
        expense: this.money(row.expense),
      })),
      expensesByCategory: top,
    };
  }

  async getCashFlowReport(
    query: CashFlowQueryDto,
  ): Promise<CashFlowReportResponseDto> {
    this.validateOptionalPeriod(query.from, query.to);
    const congregationId = await this.getCongregationId();
    const [entries, summary] = await Promise.all([
      this.findEntries(query),
      this.getEntryTotals(
        congregationId,
        query.from,
        query.to,
        query.type,
        query.categoryId,
      ),
    ]);
    return {
      ...entries,
      summary: {
        income: this.money(summary.income),
        expense: this.money(summary.expense),
        balance: this.subtractMoney(summary.income, summary.expense),
      },
    };
  }

  async exportCashFlowCsv(query: CashFlowCsvQueryDto): Promise<string> {
    if (!query.from || !query.to) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.FINANCE_EXPORT_RANGE_REQUIRED,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_EXPORT_RANGE_REQUIRED],
      });
    }
    this.validatePeriod(query.from, query.to);
    const congregationId = await this.getCongregationId();
    const qb = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.category', 'category')
      .leftJoinAndSelect('entry.member', 'member')
      .where('entry.congregationId = :congregationId', { congregationId });
    this.applyEntryFilters(qb, query);
    const entries = await qb
      .orderBy('entry.entryDate', 'ASC')
      .addOrderBy('entry.createdAt', 'ASC')
      .take(10000)
      .getMany();
    const rows = [
      [
        'Data',
        'Tipo',
        'Categoria',
        'Descrição',
        'Valor',
        'Meio de pagamento',
        'Referência',
        'Observações',
        'Membro',
      ],
      ...entries.map((entry) => [
        entry.entryDate,
        entry.type,
        entry.category.name,
        entry.description,
        this.money(entry.amount),
        entry.paymentMethod,
        entry.reference ?? '',
        entry.notes ?? '',
        entry.member?.fullName ?? '',
      ]),
    ];
    return `\uFEFF${rows.map((row) => row.map(this.csvCell).join(';')).join('\r\n')}`;
  }

  async listMemberOptions(
    query: FinanceMemberOptionsQueryDto,
  ): Promise<FinanceMemberOptionDto[]> {
    const congregationId = await this.getCongregationId();
    const qb = this.membersRepository
      .createQueryBuilder('member')
      .select(['member.id', 'member.fullName'])
      .where('member.congregationId = :congregationId', { congregationId })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .orderBy('member.fullName', 'ASC')
      .take(query.limit);
    if (query.q) {
      qb.andWhere('member.fullName LIKE :q', { q: `%${query.q}%` });
    }
    return (await qb.getMany()).map((member) => ({
      id: member.id,
      fullName: member.fullName,
    }));
  }

  async getMemberContributions(
    query: MemberContributionsQueryDto,
  ): Promise<MemberContributionsReportDto> {
    this.validatePeriod(query.from, query.to);
    const congregationId = await this.getCongregationId();
    const member = await this.getReportMemberOrFail(
      query.memberId,
      congregationId,
    );
    const baseQb = this.buildMemberContributionsQb(
      congregationId,
      query.memberId,
      query.from,
      query.to,
    );
    const totals = await baseQb
      .clone()
      .select('SUM(entry.amount)', 'total')
      .addSelect(
        `SUM(CASE WHEN category.name = :tithesName THEN entry.amount ELSE 0 END)`,
        'tithesTotal',
      )
      .addSelect(
        `SUM(CASE WHEN category.name = :offeringsName THEN entry.amount ELSE 0 END)`,
        'offeringsTotal',
      )
      .addSelect(
        `SUM(CASE WHEN category.name = :donationsName THEN entry.amount ELSE 0 END)`,
        'donationsTotal',
      )
      .addSelect('COUNT(entry.id)', 'entriesCount')
      .setParameter('tithesName', MEMBER_LINKABLE_CATEGORY_NAMES[0])
      .setParameter('offeringsName', MEMBER_LINKABLE_CATEGORY_NAMES[1])
      .setParameter('donationsName', MEMBER_LINKABLE_CATEGORY_NAMES[2])
      .getRawOne<ContributionTotalsRow>();

    const [entries, total] = await baseQb
      .clone()
      .orderBy('entry.entryDate', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      member: { id: member.id, fullName: member.fullName },
      period: { from: query.from, to: query.to },
      summary: {
        total: this.money(totals?.total),
        tithesTotal: this.money(totals?.tithesTotal),
        offeringsTotal: this.money(totals?.offeringsTotal),
        donationsTotal: this.money(totals?.donationsTotal),
        entriesCount: Number(totals?.entriesCount ?? 0),
      },
      data: entries.map((entry) => ({
        id: entry.id,
        entryDate: entry.entryDate,
        categoryName: entry.category.name,
        description: entry.description,
        amount: this.money(entry.amount),
        paymentMethod: entry.paymentMethod,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async exportMemberContributionsCsv(
    query: MemberContributionsCsvQueryDto,
  ): Promise<string> {
    if (!query.memberId) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.FINANCE_MEMBER_REQUIRED_FOR_REPORT,
        message:
          ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_REQUIRED_FOR_REPORT],
      });
    }
    this.validatePeriod(query.from, query.to);
    const congregationId = await this.getCongregationId();
    const member = await this.getReportMemberOrFail(
      query.memberId,
      congregationId,
    );
    const entries = await this.buildMemberContributionsQb(
      congregationId,
      query.memberId,
      query.from,
      query.to,
    )
      .orderBy('entry.entryDate', 'ASC')
      .addOrderBy('entry.createdAt', 'ASC')
      .take(10000)
      .getMany();
    const rows = [
      [
        'Data',
        'Categoria',
        'Descrição',
        'Valor',
        'Meio de pagamento',
        'Referência',
        'Membro',
      ],
      ...entries.map((entry) => [
        entry.entryDate,
        entry.category.name,
        entry.description,
        this.money(entry.amount),
        entry.paymentMethod,
        entry.reference ?? '',
        member.fullName,
      ]),
    ];
    return `\uFEFF${rows.map((row) => row.map(this.csvCell).join(';')).join('\r\n')}`;
  }

  private async getCongregationId(): Promise<string> {
    const congregationId = (await this.congregationsService.getOrCreateBase())
      .id;
    await this.ensureDefaultCategories(congregationId);
    return congregationId;
  }

  private async ensureDefaultCategories(congregationId: string): Promise<void> {
    const existing = await this.categoriesRepository.find({
      where: { congregationId },
    });
    const keys = new Set(
      existing.map(
        (item) => `${item.type}:${item.name.trim().toLocaleLowerCase('pt-BR')}`,
      ),
    );
    const missing = DEFAULT_CATEGORIES.filter(
      ([name, type]) => !keys.has(`${type}:${name.toLocaleLowerCase('pt-BR')}`),
    ).map(([name, type]) =>
      this.categoriesRepository.create({
        congregationId,
        name,
        type,
        active: true,
        isDefault: true,
      }),
    );
    if (missing.length === 0) return;
    try {
      await this.categoriesRepository.save(missing);
    } catch (error) {
      if (!this.isDuplicate(error)) throw error;
    }
  }

  private async validateCategory(
    id: string,
    type: FinancialType,
    congregationId: string,
    requireActive: boolean,
  ): Promise<FinancialCategory> {
    const category = await this.getCategoryOrFail(id, congregationId);
    if (category.type !== type) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FINANCE_CATEGORY_TYPE_MISMATCH,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_CATEGORY_TYPE_MISMATCH],
      });
    }
    if (requireActive && !category.active) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FINANCE_CATEGORY_INACTIVE,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_CATEGORY_INACTIVE],
      });
    }
    return category;
  }

  private async getCategoryOrFail(
    id: string,
    congregationId: string,
  ): Promise<FinancialCategory> {
    const category = await this.categoriesRepository.findOne({
      where: { id, congregationId },
    });
    if (!category) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FINANCE_CATEGORY_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_CATEGORY_NOT_FOUND],
      });
    }
    return category;
  }

  private async getEntryOrFail(
    id: string,
    congregationId: string,
  ): Promise<FinancialEntry> {
    const entry = await this.entriesRepository.findOne({
      where: { id, congregationId },
      relations: { category: true, member: true },
    });
    if (!entry) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FINANCE_ENTRY_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_ENTRY_NOT_FOUND],
      });
    }
    return entry;
  }

  private async assertMemberLinkAllowed(
    memberId: string | null | undefined,
    type: FinancialType,
    category: FinancialCategory,
    congregationId: string,
  ): Promise<Member | null> {
    if (memberId === undefined || memberId === null) {
      return null;
    }
    if (
      type !== FinancialType.INCOME ||
      !this.isMemberLinkableCategory(category)
    ) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FINANCE_MEMBER_LINK_INVALID,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_LINK_INVALID],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.FINANCE_MEMBER_LINK_INVALID,
            message: ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_LINK_INVALID],
          },
        ],
      });
    }
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FINANCE_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION],
          },
        ],
      });
    }
    return member;
  }

  private isMemberLinkableCategory(category: FinancialCategory): boolean {
    if (category.type !== FinancialType.INCOME) {
      return false;
    }
    const normalized = category.name.trim().toLocaleLowerCase('pt-BR');
    return MEMBER_LINKABLE_CATEGORY_NAMES.some(
      (name) => name.toLocaleLowerCase('pt-BR') === normalized,
    );
  }

  private async getReportMemberOrFail(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FINANCE_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION],
      });
    }
    return member;
  }

  private buildMemberContributionsQb(
    congregationId: string,
    memberId: string,
    from: string,
    to: string,
  ): SelectQueryBuilder<FinancialEntry> {
    return this.entriesRepository
      .createQueryBuilder('entry')
      .innerJoinAndSelect('entry.category', 'category')
      .where('entry.congregationId = :congregationId', { congregationId })
      .andWhere('entry.memberId = :memberId', { memberId })
      .andWhere('entry.type = :type', { type: FinancialType.INCOME })
      .andWhere('entry.entryDate BETWEEN :from AND :to', { from, to })
      .andWhere('category.name IN (:...linkableNames)', {
        linkableNames: [...MEMBER_LINKABLE_CATEGORY_NAMES],
      });
  }

  private applyEntryFilters(
    qb: SelectQueryBuilder<FinancialEntry>,
    query: {
      from?: string;
      to?: string;
      type?: FinancialType;
      categoryId?: string;
      memberId?: string;
      q?: string;
    },
  ): void {
    if (query.from)
      qb.andWhere('entry.entryDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('entry.entryDate <= :to', { to: query.to });
    if (query.type) qb.andWhere('entry.type = :type', { type: query.type });
    if (query.categoryId) {
      qb.andWhere('entry.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.memberId) {
      qb.andWhere('entry.memberId = :memberId', { memberId: query.memberId });
    }
    if (query.q) {
      qb.andWhere(
        new Brackets((nested) => {
          nested
            .where('entry.description LIKE :q', { q: `%${query.q}%` })
            .orWhere('entry.reference LIKE :q', { q: `%${query.q}%` })
            .orWhere('entry.notes LIKE :q', { q: `%${query.q}%` });
        }),
      );
    }
  }

  private async getEntryTotals(
    congregationId: string,
    from?: string,
    to?: string,
    type?: FinancialType,
    categoryId?: string,
  ): Promise<TotalRow> {
    const qb = this.entriesRepository
      .createQueryBuilder('entry')
      .select(
        "SUM(CASE WHEN entry.type = 'income' THEN entry.amount ELSE 0 END)",
        'income',
      )
      .addSelect(
        "SUM(CASE WHEN entry.type = 'expense' THEN entry.amount ELSE 0 END)",
        'expense',
      )
      .where('entry.congregationId = :congregationId', { congregationId });
    this.applyEntryFilters(qb, { from, to, type, categoryId });
    return qb
      .getRawOne<TotalRow>()
      .then((row) => row ?? { income: '0', expense: '0' });
  }

  private resolvePeriod(
    from?: string,
    to?: string,
  ): { from: string; to: string } {
    const now = new Date();
    const defaultFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const defaultTo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    )
      .toISOString()
      .slice(0, 10);
    const period = { from: from ?? defaultFrom, to: to ?? defaultTo };
    this.validatePeriod(period.from, period.to);
    return period;
  }

  private validateOptionalPeriod(from?: string, to?: string): void {
    if (from && to) this.validatePeriod(from, to);
  }

  private validatePeriod(from: string, to: string): void {
    if (from > to) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.FINANCE_EXPORT_RANGE_ORDER,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_EXPORT_RANGE_ORDER],
      });
    }
    const max = new Date(`${from}T00:00:00.000Z`);
    max.setUTCMonth(max.getUTCMonth() + 24);
    if (new Date(`${to}T00:00:00.000Z`) > max) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.FINANCE_EXPORT_RANGE_MAX,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_EXPORT_RANGE_MAX],
      });
    }
  }

  private money(value: bigint | number | string | null | undefined): string {
    const cents = typeof value === 'bigint' ? value : this.toCents(value);
    const absolute = cents < 0n ? -cents : cents;
    const integer = absolute / 100n;
    const fraction = (absolute % 100n).toString().padStart(2, '0');
    return `${cents < 0n ? '-' : ''}${integer.toString()}.${fraction}`;
  }

  private subtractMoney(
    left: number | string | null | undefined,
    right: number | string | null | undefined,
  ): string {
    return this.money(this.toCents(left) - this.toCents(right));
  }

  private toCents(value: number | string | null | undefined): bigint {
    if (value == null) return 0n;
    const normalized =
      typeof value === 'number' ? value.toFixed(2) : value.trim();
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
    if (!match) {
      throw new Error(`Valor monetário inválido: ${normalized}`);
    }
    const fraction = (match[3] ?? '').padEnd(2, '0');
    const cents = BigInt(match[2]) * 100n + BigInt(fraction);
    return match[1] === '-' ? -cents : cents;
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readonly toCategoryDto = (
    category: FinancialCategory,
  ): FinancialCategoryResponseDto => ({
    id: category.id,
    name: category.name,
    type: category.type,
    active: Boolean(category.active),
    isDefault: Boolean(category.isDefault),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  });

  private readonly toEntryDto = (
    entry: FinancialEntry,
  ): FinancialEntryResponseDto => ({
    id: entry.id,
    categoryId: entry.categoryId,
    createdByUserId: entry.createdByUserId,
    memberId: entry.memberId ?? null,
    member: entry.member
      ? { id: entry.member.id, fullName: entry.member.fullName }
      : null,
    type: entry.type,
    amount: this.money(entry.amount),
    entryDate: entry.entryDate,
    description: entry.description,
    paymentMethod: entry.paymentMethod,
    reference: entry.reference,
    notes: entry.notes,
    category: this.toCategoryDto(entry.category),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  });

  private readonly csvCell = (value: string): string =>
    `"${value.replaceAll('"', '""')}"`;

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private rethrowCategoryDuplicate(error: unknown): never {
    if (this.isDuplicate(error)) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.FINANCE_CATEGORY_DUPLICATE,
        message: ApiErrorMessage[ApiErrorCode.FINANCE_CATEGORY_DUPLICATE],
      });
    }
    throw error;
  }
}
