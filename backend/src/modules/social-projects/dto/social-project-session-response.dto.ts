import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialProjectSession } from '../entities/social-project-session.entity';

export class SocialProjectSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  socialProjectId!: string;

  @ApiPropertyOptional({ nullable: true })
  socialProjectName!: string | null;

  @ApiProperty()
  sessionDate!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  theme!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    session: SocialProjectSession,
    options?: { socialProjectName?: string | null },
  ): SocialProjectSessionResponseDto {
    const dto = new SocialProjectSessionResponseDto();
    dto.id = session.id;
    dto.congregationId = session.congregationId;
    dto.socialProjectId = session.socialProjectId;
    dto.socialProjectName =
      options?.socialProjectName ?? session.socialProject?.name ?? null;
    dto.sessionDate = session.sessionDate;
    dto.title = session.title;
    dto.theme = session.theme;
    dto.notes = session.notes;
    dto.location = session.location;
    dto.createdAt = session.createdAt;
    dto.updatedAt = session.updatedAt;
    return dto;
  }
}

export class PaginatedSocialProjectSessionsResponseDto {
  @ApiProperty({ type: SocialProjectSessionResponseDto, isArray: true })
  data!: SocialProjectSessionResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
