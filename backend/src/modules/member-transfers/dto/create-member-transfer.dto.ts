import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMemberTransferDto {
  @ApiProperty({
    example: 'Igreja Batista Central',
    minLength: 1,
    maxLength: 200,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  destinationChurchName!: string;

  @ApiProperty({ example: 'Campinas', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  destinationCity!: string;

  @ApiPropertyOptional({
    example: 'Transferência a pedido do membro',
    nullable: true,
    maxLength: 5000,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Se true, completa a transferência na mesma operação',
  })
  @IsOptional()
  @IsBoolean()
  completeNow?: boolean;
}
