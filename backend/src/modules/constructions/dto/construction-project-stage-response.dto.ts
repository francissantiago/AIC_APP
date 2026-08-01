import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConstructionProjectStage } from '../entities/construction-project-stage.entity';

export class ConstructionProjectStageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  constructionProjectId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    stage: ConstructionProjectStage,
  ): ConstructionProjectStageResponseDto {
    const dto = new ConstructionProjectStageResponseDto();
    dto.id = stage.id;
    dto.congregationId = stage.congregationId;
    dto.constructionProjectId = stage.constructionProjectId;
    dto.title = stage.title;
    dto.sortOrder = stage.sortOrder;
    dto.completedAt = stage.completedAt;
    dto.createdAt = stage.createdAt;
    dto.updatedAt = stage.updatedAt;
    return dto;
  }
}
