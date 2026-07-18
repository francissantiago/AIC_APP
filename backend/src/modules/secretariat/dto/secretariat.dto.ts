import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AttendanceEventType,
  CalendarEventType,
  CalendarRecurrenceFrequency,
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '../enums/secretariat.enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false'
      ? false
      : value;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ATTENDANCE = 1_000_000;

class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

export class CreateCalendarEventDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ enum: CalendarEventType })
  @IsEnum(CalendarEventType)
  type!: CalendarEventType;

  @ApiProperty({ format: 'date-time', example: '2026-07-20T19:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ format: 'date-time', example: '2026-07-20T21:00:00.000Z' })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  allDay: boolean = false;

  @ApiPropertyOptional({ nullable: true, maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  location?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(65535)
  description?: string | null;

  @ApiPropertyOptional({
    enum: CalendarRecurrenceFrequency,
    default: CalendarRecurrenceFrequency.NONE,
  })
  @IsOptional()
  @IsEnum(CalendarRecurrenceFrequency)
  recurrenceFrequency: CalendarRecurrenceFrequency =
    CalendarRecurrenceFrequency.NONE;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  recurrenceInterval: number = 1;

  @ApiPropertyOptional({ nullable: true, format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  recurrenceUntil?: string | null;
}

export class UpdateCalendarEventDto extends PartialType(
  CreateCalendarEventDto,
) {}

export class QueryCalendarEventsDto extends PaginationDto {
  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  override limit: number = 100;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: CalendarEventType })
  @IsOptional()
  @IsEnum(CalendarEventType)
  type?: CalendarEventType;
}

export class CalendarEventResponseDto {
  @ApiProperty({
    description:
      'ID da ocorrência (igual ao seriesId quando não recorrente; senão seriesId_ISO)',
  })
  id!: string;
  @ApiProperty({ format: 'uuid', description: 'ID do evento mestre (série)' })
  seriesId!: string;
  @ApiProperty({ format: 'uuid' })
  congregationId!: string;
  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty({ enum: CalendarEventType })
  type!: CalendarEventType;
  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;
  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;
  @ApiProperty()
  allDay!: boolean;
  @ApiPropertyOptional({ nullable: true })
  location!: string | null;
  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
  @ApiProperty({ enum: CalendarRecurrenceFrequency })
  recurrenceFrequency!: CalendarRecurrenceFrequency;
  @ApiProperty()
  recurrenceInterval!: number;
  @ApiPropertyOptional({ nullable: true, format: 'date' })
  recurrenceUntil!: string | null;
  @ApiProperty()
  isRecurring!: boolean;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedCalendarEventsResponseDto {
  @ApiProperty({ type: CalendarEventResponseDto, isArray: true })
  data!: CalendarEventResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

export class CreateVisitorDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 30 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiProperty({ format: 'date', example: '2026-07-17' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  visitDate!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(65535)
  notes?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  followUpDone: boolean = false;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  memberId?: string | null;
}

export class UpdateVisitorDto extends PartialType(CreateVisitorDto) {}

export class QueryVisitorsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  followUpDone?: boolean;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class VisitorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  congregationId!: string;
  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;
  @ApiProperty()
  fullName!: string;
  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;
  @ApiProperty({ format: 'date' })
  visitDate!: string;
  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
  @ApiProperty()
  followUpDone!: boolean;
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  memberId!: string | null;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedVisitorsResponseDto {
  @ApiProperty({ type: VisitorResponseDto, isArray: true })
  data!: VisitorResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export class CreateAttendanceRecordDto {
  @ApiProperty({ format: 'date', example: '2026-07-19' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  eventDate!: string;

  @ApiProperty({ enum: AttendanceEventType })
  @IsEnum(AttendanceEventType)
  eventType!: AttendanceEventType;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  calendarEventId?: string | null;

  @ApiProperty({ minimum: 0, maximum: MAX_ATTENDANCE })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ATTENDANCE)
  totalPresent!: number;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: MAX_ATTENDANCE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ATTENDANCE)
  adults?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: MAX_ATTENDANCE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ATTENDANCE)
  children?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(65535)
  notes?: string | null;
}

export class UpdateAttendanceRecordDto extends PartialType(
  CreateAttendanceRecordDto,
) {}

export class QueryAttendanceDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: AttendanceEventType })
  @IsOptional()
  @IsEnum(AttendanceEventType)
  eventType?: AttendanceEventType;
}

export class AttendanceRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  congregationId!: string;
  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;
  @ApiProperty({ format: 'date' })
  eventDate!: string;
  @ApiProperty({ enum: AttendanceEventType })
  eventType!: AttendanceEventType;
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  calendarEventId!: string | null;
  @ApiProperty()
  totalPresent!: number;
  @ApiPropertyOptional({ nullable: true })
  adults!: number | null;
  @ApiPropertyOptional({ nullable: true })
  children!: number | null;
  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedAttendanceResponseDto {
  @ApiProperty({ type: AttendanceRecordResponseDto, isArray: true })
  data!: AttendanceRecordResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export class CreateSecretariatDocumentDto {
  @ApiProperty({ maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: SecretariatDocumentType })
  @IsEnum(SecretariatDocumentType)
  type!: SecretariatDocumentType;

  @ApiProperty({ format: 'date', example: '2026-07-17' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  documentDate!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(65535)
  summary?: string | null;

  @ApiPropertyOptional({
    enum: SecretariatDocumentStatus,
    default: SecretariatDocumentStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(SecretariatDocumentStatus)
  status: SecretariatDocumentStatus = SecretariatDocumentStatus.DRAFT;
}

export class UpdateSecretariatDocumentDto extends PartialType(
  CreateSecretariatDocumentDto,
) {}

export class QuerySecretariatDocumentsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SecretariatDocumentType })
  @IsOptional()
  @IsEnum(SecretariatDocumentType)
  type?: SecretariatDocumentType;

  @ApiPropertyOptional({ enum: SecretariatDocumentStatus })
  @IsOptional()
  @IsEnum(SecretariatDocumentStatus)
  status?: SecretariatDocumentStatus;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class SecretariatDocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  congregationId!: string;
  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty({ enum: SecretariatDocumentType })
  type!: SecretariatDocumentType;
  @ApiProperty({ format: 'date' })
  documentDate!: string;
  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;
  @ApiProperty({ enum: SecretariatDocumentStatus })
  status!: SecretariatDocumentStatus;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedSecretariatDocumentsResponseDto {
  @ApiProperty({ type: SecretariatDocumentResponseDto, isArray: true })
  data!: SecretariatDocumentResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export class UpcomingEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty({ enum: CalendarEventType })
  type!: CalendarEventType;
  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;
  @ApiPropertyOptional({ nullable: true })
  location!: string | null;
}

export class BirthdayDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  fullName!: string;
  @ApiProperty({ format: 'date' })
  birthDate!: string;
}

export class AttendanceByMonthDto {
  @ApiProperty({ example: '2026-07' })
  month!: string;
  @ApiProperty()
  total!: number;
}

export class VisitorsByMonthDto {
  @ApiProperty({ example: '2026-07' })
  month!: string;
  @ApiProperty()
  total!: number;
}

export class SecretariatDashboardResponseDto {
  @ApiProperty()
  upcomingEventsCount!: number;
  @ApiProperty({ type: UpcomingEventDto, isArray: true })
  upcomingEvents!: UpcomingEventDto[];
  @ApiProperty()
  visitorsThisMonth!: number;
  @ApiProperty()
  pendingFollowUps!: number;
  @ApiPropertyOptional({ nullable: true })
  lastAttendanceTotal!: number | null;
  @ApiPropertyOptional({ nullable: true, format: 'date' })
  lastAttendanceDate!: string | null;
  @ApiProperty({ type: BirthdayDto, isArray: true })
  birthdaysThisWeek!: BirthdayDto[];
  @ApiProperty({ type: AttendanceByMonthDto, isArray: true })
  attendanceByMonth!: AttendanceByMonthDto[];
  @ApiProperty({ type: VisitorsByMonthDto, isArray: true })
  visitorsByMonth!: VisitorsByMonthDto[];
}
