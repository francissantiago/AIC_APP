import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissionField } from '../entities/mission-field.entity';
import { MissionFieldStatus } from '../enums/mission-field-status.enum';

export class MissionFieldResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'África — Quênia' })
  name!: string;

  @ApiProperty({ example: 'Quênia' })
  country!: string;

  @ApiPropertyOptional({ example: 'Nairobi', nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ example: 'Nairobi County', nullable: true })
  region!: string | null;

  @ApiPropertyOptional({
    example: 'Campo missionário na África Oriental',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
  })
  coordinatorMemberId!: string | null;

  @ApiPropertyOptional({ example: 'João da Silva', nullable: true })
  coordinatorMemberName!: string | null;

  @ApiProperty({ enum: MissionFieldStatus, example: MissionFieldStatus.ACTIVE })
  status!: MissionFieldStatus;

  @ApiPropertyOptional({ example: 3 })
  assignmentsCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    field: MissionField,
    options?: { assignmentsCount?: number },
  ): MissionFieldResponseDto {
    const dto = new MissionFieldResponseDto();
    dto.id = field.id;
    dto.congregationId = field.congregationId;
    dto.name = field.name;
    dto.country = field.country;
    dto.city = field.city;
    dto.region = field.region;
    dto.description = field.description;
    dto.coordinatorMemberId = field.coordinatorMemberId;
    dto.coordinatorMemberName = field.coordinatorMember?.fullName ?? null;
    dto.status = field.status;
    dto.createdAt = field.createdAt;
    dto.updatedAt = field.updatedAt;
    if (options?.assignmentsCount !== undefined) {
      dto.assignmentsCount = options.assignmentsCount;
    }
    return dto;
  }
}

export class PaginatedMissionFieldsResponseDto {
  @ApiProperty({ type: MissionFieldResponseDto, isArray: true })
  data!: MissionFieldResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
