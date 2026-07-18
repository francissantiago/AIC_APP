import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SmallGroupMeeting } from '../entities/small-group-meeting.entity';

export class SmallGroupMeetingResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: '11111111-2222-3333-4444-555555555555' })
  smallGroupId!: string;

  @ApiProperty({ example: '2026-07-18', format: 'date' })
  meetingDate!: string;

  @ApiPropertyOptional({ example: 'Discipulado', nullable: true })
  theme!: string | null;

  @ApiPropertyOptional({ example: 'Estudo do capítulo 1', nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(meeting: SmallGroupMeeting): SmallGroupMeetingResponseDto {
    const dto = new SmallGroupMeetingResponseDto();
    dto.id = meeting.id;
    dto.smallGroupId = meeting.smallGroupId;
    dto.meetingDate =
      typeof meeting.meetingDate === 'string'
        ? meeting.meetingDate.slice(0, 10)
        : String(meeting.meetingDate).slice(0, 10);
    dto.theme = meeting.theme;
    dto.notes = meeting.notes;
    dto.createdAt = meeting.createdAt;
    dto.updatedAt = meeting.updatedAt;
    return dto;
  }
}

export class PaginatedSmallGroupMeetingsResponseDto {
  @ApiProperty({ type: SmallGroupMeetingResponseDto, isArray: true })
  data!: SmallGroupMeetingResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
