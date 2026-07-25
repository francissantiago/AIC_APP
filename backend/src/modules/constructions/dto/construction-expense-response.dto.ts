import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FinancialType,
  PaymentMethod,
} from '../../finance/enums/finance.enums';

export class ConstructionExpenseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  constructionProjectId!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiPropertyOptional({ nullable: true })
  categoryName!: string | null;

  @ApiProperty({ enum: FinancialType })
  type!: FinancialType;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  entryDate!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ nullable: true })
  reference!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedConstructionExpensesResponseDto {
  @ApiProperty({ type: ConstructionExpenseResponseDto, isArray: true })
  data!: ConstructionExpenseResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
