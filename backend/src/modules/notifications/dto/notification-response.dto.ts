import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';
import { NotificationReferenceType } from '../enums/notification-reference-type.enum';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ example: 'Follow-up de visitante pendente' })
  title!: string;

  @ApiProperty({
    example:
      'O visitante João aguarda follow-up há mais de 7 dias (visita em 2026-07-01).',
  })
  body!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  payload!: Record<string, unknown> | null;

  @ApiProperty({ enum: NotificationReferenceType })
  referenceType!: NotificationReferenceType;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  referenceId!: string;

  @ApiPropertyOptional({
    example: '2026-07-18T12:00:00.000Z',
    nullable: true,
  })
  readAt!: string | null;

  @ApiProperty({ example: '2026-07-18T12:00:00.000Z' })
  createdAt!: string;

  static fromEntity(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.body = notification.body;
    dto.payload = notification.payload;
    dto.referenceType = notification.referenceType;
    dto.referenceId = notification.referenceId;
    dto.readAt = notification.readAt ? notification.readAt.toISOString() : null;
    dto.createdAt = notification.createdAt.toISOString();
    return dto;
  }
}
