import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Announcement } from '../entities/announcement.entity';
import { AnnouncementAudience } from '../enums/announcement-audience.enum';
import { AnnouncementStatus } from '../enums/announcement-status.enum';

export class AnnouncementResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'Culto de ação de graças' })
  title!: string;

  @ApiProperty({ example: 'Neste domingo teremos culto especial às 19h.' })
  body!: string;

  @ApiProperty({ enum: AnnouncementAudience })
  audience!: AnnouncementAudience;

  @ApiPropertyOptional({ type: [String], nullable: true })
  audienceTargets!: string[] | null;

  @ApiProperty({ example: '2026-07-18T12:00:00.000Z' })
  publishedAt!: string;

  @ApiPropertyOptional({
    example: '2026-08-01T23:59:59.000Z',
    nullable: true,
  })
  expiresAt!: string | null;

  @ApiProperty({ example: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff' })
  authorUserId!: string;

  @ApiProperty({ example: 'João da Silva' })
  authorFullName!: string;

  @ApiProperty({ enum: AnnouncementStatus })
  status!: AnnouncementStatus;

  @ApiProperty({ example: '2026-07-18T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-18T12:00:00.000Z' })
  updatedAt!: string;

  static fromEntity(
    announcement: Announcement,
    now: Date = new Date(),
  ): AnnouncementResponseDto {
    const dto = new AnnouncementResponseDto();
    dto.id = announcement.id;
    dto.congregationId = announcement.congregationId;
    dto.title = announcement.title;
    dto.body = announcement.body;
    dto.audience = announcement.audience;
    dto.audienceTargets = announcement.audienceTargets;
    dto.publishedAt = announcement.publishedAt.toISOString();
    dto.expiresAt = announcement.expiresAt
      ? announcement.expiresAt.toISOString()
      : null;
    dto.authorUserId = announcement.authorUserId;
    dto.authorFullName = announcement.author?.fullName ?? '';
    dto.status = AnnouncementResponseDto.deriveStatus(announcement, now);
    dto.createdAt = announcement.createdAt.toISOString();
    dto.updatedAt = announcement.updatedAt.toISOString();
    return dto;
  }

  static deriveStatus(
    announcement: Pick<Announcement, 'publishedAt' | 'expiresAt'>,
    now: Date = new Date(),
  ): AnnouncementStatus {
    if (announcement.publishedAt.getTime() > now.getTime()) {
      return AnnouncementStatus.SCHEDULED;
    }
    if (
      announcement.expiresAt !== null &&
      announcement.expiresAt.getTime() <= now.getTime()
    ) {
      return AnnouncementStatus.EXPIRED;
    }
    return AnnouncementStatus.ACTIVE;
  }
}
