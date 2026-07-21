import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType } from '../../secretariat/enums/secretariat.enums';

export class DashboardKpisDto {
  @ApiPropertyOptional({ nullable: true })
  activeMembers!: number | null;

  @ApiPropertyOptional({ nullable: true })
  visitorsThisMonth!: number | null;

  @ApiPropertyOptional({ nullable: true })
  pendingFollowUps!: number | null;

  @ApiPropertyOptional({ nullable: true })
  upcomingEventsCount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  lastAttendanceTotal!: number | null;

  @ApiPropertyOptional({ nullable: true, format: 'date' })
  lastAttendanceDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  monthIncome!: string | null;

  @ApiPropertyOptional({ nullable: true })
  monthExpense!: string | null;

  @ApiPropertyOptional({ nullable: true })
  monthBalance!: string | null;

  @ApiProperty()
  unreadNotifications!: number;
}

export class DashboardAlertDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ['critical', 'warning', 'info'],
    description: 'Severidade do alerta',
  })
  severity!: 'critical' | 'warning' | 'info';

  @ApiProperty({
    description: 'Código estável do alerta',
  })
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ nullable: true })
  count?: number | null;

  @ApiPropertyOptional({ nullable: true })
  href?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class DashboardChartDataPointDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: number;
}

export class DashboardMonthlyDataPointDto {
  @ApiProperty({ example: '2026-07' })
  month!: string;

  @ApiProperty()
  total!: number;
}

export class DashboardFinanceMonthlyDataPointDto {
  @ApiProperty({ example: '2026-07' })
  month!: string;

  @ApiProperty()
  income!: string;

  @ApiProperty()
  expense!: string;
}

export class DashboardChartsDto {
  @ApiPropertyOptional({
    type: DashboardChartDataPointDto,
    isArray: true,
    nullable: true,
  })
  membersByStatus!: DashboardChartDataPointDto[] | null;

  @ApiPropertyOptional({
    type: DashboardMonthlyDataPointDto,
    isArray: true,
    nullable: true,
  })
  attendanceByMonth!: DashboardMonthlyDataPointDto[] | null;

  @ApiPropertyOptional({
    type: DashboardFinanceMonthlyDataPointDto,
    isArray: true,
    nullable: true,
  })
  financeByMonth!: DashboardFinanceMonthlyDataPointDto[] | null;
}

export class DashboardUpcomingEventDto {
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

export class DashboardBirthdayDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ format: 'date' })
  birthDate!: string;
}

export class DashboardAnnouncementDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ format: 'date-time' })
  publishedAt!: Date;
}

export class DashboardOverviewResponseDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ type: DashboardKpisDto })
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: DashboardAlertDto, isArray: true })
  alerts!: DashboardAlertDto[];

  @ApiProperty({ type: DashboardChartsDto })
  charts!: DashboardChartsDto;

  @ApiPropertyOptional({
    type: DashboardUpcomingEventDto,
    isArray: true,
    nullable: true,
  })
  upcomingEvents!: DashboardUpcomingEventDto[] | null;

  @ApiPropertyOptional({
    type: DashboardBirthdayDto,
    isArray: true,
    nullable: true,
  })
  birthdaysThisWeek!: DashboardBirthdayDto[] | null;

  @ApiPropertyOptional({
    type: DashboardAnnouncementDto,
    isArray: true,
    nullable: true,
  })
  recentAnnouncements!: DashboardAnnouncementDto[] | null;
}
