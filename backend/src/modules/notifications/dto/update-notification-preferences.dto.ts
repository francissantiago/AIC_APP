import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { NotificationPreferenceItemDto } from './notification-preference-item.dto';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  items!: NotificationPreferenceItemDto[];
}
