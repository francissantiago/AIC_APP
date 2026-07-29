import { ApiProperty } from '@nestjs/swagger';
import { NotificationPreferenceItemDto } from './notification-preference-item.dto';

export class NotificationPreferencesResponseDto {
  @ApiProperty({ type: [NotificationPreferenceItemDto] })
  items!: NotificationPreferenceItemDto[];
}
