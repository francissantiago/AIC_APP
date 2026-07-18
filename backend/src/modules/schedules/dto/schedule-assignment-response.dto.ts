import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleAssignment } from '../entities/schedule-assignment.entity';

export class ScheduleEventSummaryDto {
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
}

export class ScheduleMinistrySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ScheduleMemberSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}

export class ScheduleAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  calendarEventId!: string;

  @ApiProperty({ format: 'uuid' })
  ministryId!: string;

  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty()
  roleLabel!: string;

  @ApiProperty()
  confirmed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: ScheduleEventSummaryDto })
  event!: ScheduleEventSummaryDto;

  @ApiProperty({ type: ScheduleMinistrySummaryDto })
  ministry!: ScheduleMinistrySummaryDto;

  @ApiProperty({ type: ScheduleMemberSummaryDto })
  member!: ScheduleMemberSummaryDto;

  static fromEntity(
    assignment: ScheduleAssignment,
  ): ScheduleAssignmentResponseDto {
    return {
      id: assignment.id,
      calendarEventId: assignment.calendarEventId,
      ministryId: assignment.ministryId,
      memberId: assignment.memberId,
      roleLabel: assignment.roleLabel,
      confirmed: Boolean(assignment.confirmed),
      notes: assignment.notes,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      event: {
        id: assignment.calendarEvent.id,
        title: assignment.calendarEvent.title,
        type: assignment.calendarEvent.type,
        startsAt: assignment.calendarEvent.startsAt,
        endsAt: assignment.calendarEvent.endsAt,
      },
      ministry: {
        id: assignment.ministry.id,
        name: assignment.ministry.name,
      },
      member: {
        id: assignment.member.id,
        fullName: assignment.member.fullName,
      },
    };
  }
}

export class PaginatedScheduleAssignmentsResponseDto {
  @ApiProperty({ type: ScheduleAssignmentResponseDto, isArray: true })
  data!: ScheduleAssignmentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ScheduleMemberOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({
    description: 'Papel do membro no ministério (ministry_members.role)',
  })
  ministryRole!: string;
}
