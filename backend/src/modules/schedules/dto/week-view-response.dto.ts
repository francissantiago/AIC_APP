import { ApiProperty } from '@nestjs/swagger';
import { ScheduleAssignmentResponseDto } from './schedule-assignment-response.dto';

export class WeekViewMinistryGroupDto {
  @ApiProperty({ format: 'uuid' })
  ministryId!: string;

  @ApiProperty()
  ministryName!: string;

  @ApiProperty({ type: ScheduleAssignmentResponseDto, isArray: true })
  assignments!: ScheduleAssignmentResponseDto[];
}

export class WeekViewEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ type: WeekViewMinistryGroupDto, isArray: true })
  ministries!: WeekViewMinistryGroupDto[];
}

export class WeekViewResponseDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: WeekViewEventDto, isArray: true })
  events!: WeekViewEventDto[];
}
