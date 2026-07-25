import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConstructionUpdate } from '../entities/construction-update.entity';

export class ConstructionUpdateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  constructionProjectId!: string;

  @ApiPropertyOptional({ nullable: true })
  projectName!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  progressPercent!: number | null;

  @ApiProperty()
  recordedAt!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(update: ConstructionUpdate): ConstructionUpdateResponseDto {
    const dto = new ConstructionUpdateResponseDto();
    dto.id = update.id;
    dto.congregationId = update.congregationId;
    dto.constructionProjectId = update.constructionProjectId;
    dto.projectName = update.constructionProject?.name ?? null;
    dto.title = update.title;
    dto.description = update.description;
    dto.progressPercent = update.progressPercent;
    dto.recordedAt = update.recordedAt;
    dto.createdAt = update.createdAt;
    dto.updatedAt = update.updatedAt;
    return dto;
  }
}

export class PaginatedConstructionUpdatesResponseDto {
  @ApiProperty({ type: ConstructionUpdateResponseDto, isArray: true })
  data!: ConstructionUpdateResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
