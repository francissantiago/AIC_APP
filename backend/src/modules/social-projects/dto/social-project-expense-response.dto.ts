import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatedByUserSummaryDto } from '../../../common/dto/created-by-user-summary.dto';
import {
  FinancialType,
  PaymentMethod,
} from '../../finance/enums/finance.enums';
import { FinanceMemberSummaryDto } from '../../finance/dto/finance.dto';

export class SocialProjectExpenseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  socialProjectId!: string;

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

  @ApiPropertyOptional({ type: FinanceMemberSummaryDto, nullable: true })
  member!: FinanceMemberSummaryDto | null;

  @ApiPropertyOptional({ type: CreatedByUserSummaryDto, nullable: true })
  createdBy!: CreatedByUserSummaryDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedSocialProjectExpensesResponseDto {
  @ApiProperty({ type: SocialProjectExpenseResponseDto, isArray: true })
  data!: SocialProjectExpenseResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
