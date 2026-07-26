import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CreateSocialProjectDto } from './create-social-project.dto';

export class UpdateSocialProjectDto extends PartialType(
  OmitType(CreateSocialProjectDto, ['budgetAmount'] as const),
) {
  @ApiPropertyOptional({ example: 5000, nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetAmount?: number | null;
}
