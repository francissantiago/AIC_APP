import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryFamilyBirthdaysDto {
  @ApiProperty({
    example: 7,
    minimum: 1,
    maximum: 12,
    description: 'Mês do aniversário (1–12)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiPropertyOptional({
    example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
    description: 'Filtra aniversariantes de uma família específica',
  })
  @IsOptional()
  @IsUUID()
  familyId?: string;
}
