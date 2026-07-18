import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { FinancialType, PaymentMethod } from '../enums/finance.enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const MAX_MONEY = 99_999_999_999.99;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateFinancialCategoryDto {
  @ApiProperty({ example: 'Dízimos', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: FinancialType })
  @IsEnum(FinancialType)
  type!: FinancialType;
}

export class UpdateFinancialCategoryDto extends PartialType(
  CreateFinancialCategoryDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class QueryFinancialCategoriesDto {
  @ApiPropertyOptional({ enum: FinancialType })
  @IsOptional()
  @IsEnum(FinancialType)
  type?: FinancialType;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === true || value === 'true'
      ? true
      : value === false || value === 'false'
        ? false
        : value,
  )
  @IsBoolean()
  active?: boolean;
}

export class CreateFinancialEntryDto {
  @ApiProperty({ example: '2026-07-17', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  entryDate!: string;

  @ApiProperty({ enum: FinancialType })
  @IsEnum(FinancialType)
  type!: FinancialType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'Oferta do culto', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @ApiProperty({ example: 1250.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_MONEY)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.OTHER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.OTHER;

  @ApiPropertyOptional({ nullable: true, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  reference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(65535)
  notes?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Membro opcional (apenas Dízimos/Ofertas/Doações)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  memberId?: string | null;
}

export class UpdateFinancialEntryDto extends PartialType(
  CreateFinancialEntryDto,
) {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Enviar null para desvincular o membro',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  memberId?: string | null;
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class PeriodQueryDto {
  @ApiPropertyOptional({ example: '2026-07-01', format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-31', format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to?: string;
}

export class QueryFinancialEntriesDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: FinancialType })
  @IsOptional()
  @IsEnum(FinancialType)
  type?: FinancialType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class CashFlowQueryDto extends QueryFinancialEntriesDto {}

export class CashFlowCsvQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({ enum: FinancialType })
  @IsOptional()
  @IsEnum(FinancialType)
  type?: FinancialType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class FinanceMemberOptionsQueryDto {
  @ApiPropertyOptional({ maxLength: 150, description: 'Busca por nome' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  q?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export class MemberContributionsQueryDto extends PaginationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: '2026-01-01', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from!: string;

  @ApiProperty({ example: '2026-12-31', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to!: string;
}

export class MemberContributionsCsvQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: '2026-01-01', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from!: string;

  @ApiProperty({ example: '2026-12-31', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to!: string;
}

export class FinancialCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ enum: FinancialType })
  type!: FinancialType;
  @ApiProperty()
  active!: boolean;
  @ApiProperty()
  isDefault!: boolean;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class FinanceMemberSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  fullName!: string;
}

export class FinanceMemberOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  fullName!: string;
}

export class FinancialEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;
  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  memberId!: string | null;
  @ApiPropertyOptional({ type: FinanceMemberSummaryDto, nullable: true })
  member!: FinanceMemberSummaryDto | null;
  @ApiProperty({ enum: FinancialType })
  type!: FinancialType;
  @ApiProperty({ example: '1250.00', description: 'Decimal como string' })
  amount!: string;
  @ApiProperty({ format: 'date' })
  entryDate!: string;
  @ApiProperty()
  description!: string;
  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;
  @ApiPropertyOptional({ nullable: true })
  reference!: string | null;
  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
  @ApiProperty({ type: FinancialCategoryResponseDto })
  category!: FinancialCategoryResponseDto;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class MemberContributionsSummaryDto {
  @ApiProperty({ example: '1500.00' })
  total!: string;
  @ApiProperty({ example: '1000.00' })
  tithesTotal!: string;
  @ApiProperty({ example: '500.00' })
  offeringsTotal!: string;
  @ApiProperty({ example: '200.00' })
  donationsTotal!: string;
  @ApiProperty()
  entriesCount!: number;
}

export class MemberContributionItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'date' })
  entryDate!: string;
  @ApiProperty()
  categoryName!: string;
  @ApiProperty()
  description!: string;
  @ApiProperty({ example: '100.00' })
  amount!: string;
  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;
}

export class PaginatedFinancialEntriesResponseDto {
  @ApiProperty({ type: FinancialEntryResponseDto, isArray: true })
  data!: FinancialEntryResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

export class PeriodResponseDto {
  @ApiProperty({ format: 'date' })
  from!: string;
  @ApiProperty({ format: 'date' })
  to!: string;
}

export class MemberContributionsReportDto {
  @ApiProperty({ type: FinanceMemberSummaryDto })
  member!: FinanceMemberSummaryDto;
  @ApiProperty({ type: PeriodResponseDto })
  period!: PeriodResponseDto;
  @ApiProperty({ type: MemberContributionsSummaryDto })
  summary!: MemberContributionsSummaryDto;
  @ApiProperty({ type: MemberContributionItemDto, isArray: true })
  data!: MemberContributionItemDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

export class FinancialTotalsDto {
  @ApiProperty({ example: '1000.00' })
  income!: string;
  @ApiProperty({ example: '400.00' })
  expense!: string;
  @ApiProperty({ example: '600.00' })
  balance!: string;
  @ApiProperty()
  activeAssets!: number;
  @ApiProperty({ example: '25000.00' })
  estimatedAssetValue!: string;
}

export class MonthlyFinancialDto {
  @ApiProperty({ example: '2026-07' })
  month!: string;
  @ApiProperty({ example: '1000.00' })
  income!: string;
  @ApiProperty({ example: '400.00' })
  expense!: string;
}

export class ExpenseByCategoryDto {
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  categoryId!: string | null;
  @ApiProperty()
  categoryName!: string;
  @ApiProperty({ example: '400.00' })
  amount!: string;
}

export class FinancialDashboardResponseDto {
  @ApiProperty({ type: PeriodResponseDto })
  period!: PeriodResponseDto;
  @ApiProperty({ type: FinancialTotalsDto })
  totals!: FinancialTotalsDto;
  @ApiProperty({ type: MonthlyFinancialDto, isArray: true })
  monthly!: MonthlyFinancialDto[];
  @ApiProperty({ type: ExpenseByCategoryDto, isArray: true })
  expensesByCategory!: ExpenseByCategoryDto[];
}

export class CashFlowSummaryDto {
  @ApiProperty({ example: '1000.00' })
  income!: string;
  @ApiProperty({ example: '400.00' })
  expense!: string;
  @ApiProperty({ example: '600.00' })
  balance!: string;
}

export class CashFlowReportResponseDto extends PaginatedFinancialEntriesResponseDto {
  @ApiProperty({ type: CashFlowSummaryDto })
  summary!: CashFlowSummaryDto;
}
