import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false'
      ? false
      : value;

export class QueryWeekViewDto {
  @ApiProperty({
    description: 'Início do período (ISO date ou datetime)',
    example: '2026-07-13',
  })
  @IsDateString()
  from!: string;

  @ApiProperty({
    description: 'Fim do período (ISO date ou datetime)',
    example: '2026-07-19T23:59:59.999Z',
  })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ministryId?: string;

  @ApiPropertyOptional({
    description: 'Quando true, retorna apenas atribuições não confirmadas',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unconfirmedOnly?: boolean;
}
