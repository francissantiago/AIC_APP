import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateConstructionPhotoDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;

  @ApiPropertyOptional({
    description: 'Vincular foto a um andamento específico',
  })
  @IsOptional()
  @IsUUID()
  constructionUpdateId?: string;
}
