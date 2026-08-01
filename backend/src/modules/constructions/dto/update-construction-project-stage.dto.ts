import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateConstructionProjectStageDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    description: 'true = marcar concluída; false = marcar pendente',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description: 'Observação sobre a alteração de progresso (avanço ou retrocesso)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string;
}
