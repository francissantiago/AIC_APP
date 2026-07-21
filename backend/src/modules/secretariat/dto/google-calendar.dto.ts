import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  GoogleCalendarConflictPolicy,
  GoogleCalendarConnectionStatus,
  GoogleCalendarSyncDirection,
} from '../enums/secretariat.enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class GoogleCalendarOAuthUrlResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  state!: string;
}

export class GoogleCalendarConnectionStatusDto {
  @ApiProperty()
  connected!: boolean;

  @ApiPropertyOptional({ enum: GoogleCalendarConnectionStatus })
  status!: GoogleCalendarConnectionStatus | null;

  @ApiPropertyOptional({
    description: 'E-mail parcialmente mascarado',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  googleCalendarId!: string | null;

  @ApiPropertyOptional({ enum: GoogleCalendarSyncDirection, nullable: true })
  syncDirection!: GoogleCalendarSyncDirection | null;

  @ApiPropertyOptional({ enum: GoogleCalendarConflictPolicy, nullable: true })
  conflictPolicy!: GoogleCalendarConflictPolicy | null;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
  })
  lastSyncAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastSyncError!: string | null;
}

export class GoogleCalendarListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  primary!: boolean;

  @ApiPropertyOptional({ nullable: true })
  accessRole!: string | null;
}

export class GoogleCalendarListResponseDto {
  @ApiProperty({ type: [GoogleCalendarListItemDto] })
  items!: GoogleCalendarListItemDto[];
}

export class UpdateGoogleCalendarSettingsDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  googleCalendarId?: string;

  @ApiPropertyOptional({ enum: GoogleCalendarSyncDirection })
  @IsOptional()
  @IsEnum(GoogleCalendarSyncDirection)
  syncDirection?: GoogleCalendarSyncDirection;

  @ApiPropertyOptional({ enum: GoogleCalendarConflictPolicy })
  @IsOptional()
  @IsEnum(GoogleCalendarConflictPolicy)
  conflictPolicy?: GoogleCalendarConflictPolicy;
}

export class GoogleCalendarSyncResultDto {
  @ApiProperty()
  pushed!: number;

  @ApiProperty()
  pulled!: number;

  @ApiProperty()
  conflicts!: number;

  @ApiProperty()
  errors!: number;

  @ApiProperty({ type: [String] })
  warnings!: string[];
}

export class GoogleCalendarDisconnectResponseDto {
  @ApiProperty({ example: true })
  disconnected!: boolean;
}
