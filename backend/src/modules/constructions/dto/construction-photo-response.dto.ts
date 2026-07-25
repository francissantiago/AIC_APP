import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConstructionPhoto } from '../entities/construction-photo.entity';

export class ConstructionPhotoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  constructionProjectId!: string;

  @ApiPropertyOptional({ nullable: true })
  constructionUpdateId!: string | null;

  @ApiProperty()
  uploadedByUserId!: string;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiPropertyOptional({ nullable: true })
  caption!: string | null;

  @ApiProperty()
  contentUrl!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    photo: ConstructionPhoto,
    contentUrl: string,
  ): ConstructionPhotoResponseDto {
    const dto = new ConstructionPhotoResponseDto();
    dto.id = photo.id;
    dto.congregationId = photo.congregationId;
    dto.constructionProjectId = photo.constructionProjectId;
    dto.constructionUpdateId = photo.constructionUpdateId;
    dto.uploadedByUserId = photo.uploadedByUserId;
    dto.originalFilename = photo.originalFilename;
    dto.mimeType = photo.mimeType;
    dto.sizeBytes = photo.sizeBytes;
    dto.caption = photo.caption;
    dto.contentUrl = contentUrl;
    dto.createdAt = photo.createdAt;
    dto.updatedAt = photo.updatedAt;
    return dto;
  }
}

export class PaginatedConstructionPhotosResponseDto {
  @ApiProperty({ type: ConstructionPhotoResponseDto, isArray: true })
  data!: ConstructionPhotoResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
