import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationPreferenceItemDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}
