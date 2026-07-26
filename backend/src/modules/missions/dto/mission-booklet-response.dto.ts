import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissionBooklet } from '../entities/mission-booklet.entity';
import { MissionBookletDestinationType } from '../enums/mission-booklet-destination-type.enum';
import { MissionBookletStatus } from '../enums/mission-booklet-status.enum';

export class MissionBookletResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  memberName!: string;

  @ApiProperty({ enum: MissionBookletDestinationType })
  destinationType!: MissionBookletDestinationType;

  @ApiPropertyOptional({ nullable: true })
  missionFieldId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  missionFieldName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  missionAssignmentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  missionAssignmentLabel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  title!: string | null;

  @ApiProperty()
  installmentCount!: number;

  @ApiProperty()
  installmentAmount!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  firstDueDate!: string;

  @ApiProperty({ enum: MissionBookletStatus })
  status!: MissionBookletStatus;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdByUserId!: string;

  @ApiPropertyOptional()
  paidCount?: number;

  @ApiPropertyOptional()
  pendingCount?: number;

  @ApiPropertyOptional()
  totalPaid?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    booklet: MissionBooklet,
    options?: {
      paidCount?: number;
      pendingCount?: number;
      totalPaid?: string;
    },
  ): MissionBookletResponseDto {
    const dto = new MissionBookletResponseDto();
    dto.id = booklet.id;
    dto.congregationId = booklet.congregationId;
    dto.memberId = booklet.memberId;
    dto.memberName = booklet.member?.fullName ?? '';
    dto.destinationType = booklet.destinationType;
    dto.missionFieldId = booklet.missionFieldId;
    dto.missionFieldName = booklet.missionField?.name ?? null;
    dto.missionAssignmentId = booklet.missionAssignmentId;
    dto.missionAssignmentLabel = booklet.missionAssignment
      ? `${booklet.missionAssignment.member?.fullName ?? ''} — ${booklet.missionAssignment.missionField?.name ?? ''}`.trim()
      : null;
    dto.title = booklet.title;
    dto.installmentCount = booklet.installmentCount;
    dto.installmentAmount = booklet.installmentAmount;
    dto.totalAmount = booklet.totalAmount;
    dto.firstDueDate = booklet.firstDueDate;
    dto.status = booklet.status;
    dto.notes = booklet.notes;
    dto.createdByUserId = booklet.createdByUserId;
    dto.createdAt = booklet.createdAt;
    dto.updatedAt = booklet.updatedAt;
    if (options?.paidCount !== undefined) dto.paidCount = options.paidCount;
    if (options?.pendingCount !== undefined) {
      dto.pendingCount = options.pendingCount;
    }
    if (options?.totalPaid !== undefined) dto.totalPaid = options.totalPaid;
    return dto;
  }
}

export class PaginatedMissionBookletsResponseDto {
  @ApiProperty({ type: MissionBookletResponseDto, isArray: true })
  data!: MissionBookletResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
