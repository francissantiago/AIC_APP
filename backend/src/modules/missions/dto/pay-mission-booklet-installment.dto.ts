import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../finance/enums/finance.enums';

export class PayMissionBookletInstallmentDto {
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.OTHER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.OTHER;

  @ApiPropertyOptional({ example: '2026-08-05' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
