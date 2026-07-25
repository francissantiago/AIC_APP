import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissionAssignment } from '../entities/mission-assignment.entity';
import { MissionAssignmentRole } from '../enums/mission-assignment-role.enum';
import { MissionAssignmentStatus } from '../enums/mission-assignment-status.enum';

export class MissionAssignmentResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberName!: string;

  @ApiProperty({ example: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff' })
  missionFieldId!: string;

  @ApiProperty({ example: 'África — Quênia' })
  missionFieldName!: string;

  @ApiProperty({
    enum: MissionAssignmentRole,
    example: MissionAssignmentRole.MISSIONARY,
  })
  role!: MissionAssignmentRole;

  @ApiProperty({
    enum: MissionAssignmentStatus,
    example: MissionAssignmentStatus.ACTIVE,
  })
  status!: MissionAssignmentStatus;

  @ApiProperty({ example: '2026-01-15' })
  startDate!: string;

  @ApiPropertyOptional({ example: '2028-01-15', nullable: true })
  expectedEndDate!: string | null;

  @ApiPropertyOptional({ example: '2028-06-01', nullable: true })
  actualEndDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    assignment: MissionAssignment,
  ): MissionAssignmentResponseDto {
    const dto = new MissionAssignmentResponseDto();
    dto.id = assignment.id;
    dto.congregationId = assignment.congregationId;
    dto.memberId = assignment.memberId;
    dto.memberName = assignment.member?.fullName ?? '';
    dto.missionFieldId = assignment.missionFieldId;
    dto.missionFieldName = assignment.missionField?.name ?? '';
    dto.role = assignment.role;
    dto.status = assignment.status;
    dto.startDate = assignment.startDate;
    dto.expectedEndDate = assignment.expectedEndDate;
    dto.actualEndDate = assignment.actualEndDate;
    dto.notes = assignment.notes;
    dto.createdAt = assignment.createdAt;
    dto.updatedAt = assignment.updatedAt;
    return dto;
  }
}

export class PaginatedMissionAssignmentsResponseDto {
  @ApiProperty({ type: MissionAssignmentResponseDto, isArray: true })
  data!: MissionAssignmentResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
