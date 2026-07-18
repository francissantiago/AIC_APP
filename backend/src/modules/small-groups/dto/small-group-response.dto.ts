import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupStatus } from '../enums/small-group-status.enum';

export class SmallGroupLeaderSummaryDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  fullName!: string;
}

export class SmallGroupResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'Célula Centro' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Grupo de comunhão do centro',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
  })
  leaderMemberId!: string | null;

  @ApiPropertyOptional({ type: SmallGroupLeaderSummaryDto, nullable: true })
  leader!: SmallGroupLeaderSummaryDto | null;

  @ApiPropertyOptional({ example: 'Rua das Flores, 100', nullable: true })
  address!: string | null;

  @ApiProperty({ example: 3, minimum: 0, maximum: 6 })
  dayOfWeek!: number;

  @ApiPropertyOptional({ example: '19:30:00', nullable: true })
  startTime!: string | null;

  @ApiProperty({ enum: SmallGroupStatus, example: SmallGroupStatus.ACTIVE })
  status!: SmallGroupStatus;

  @ApiPropertyOptional({
    example: 12,
    description: 'Quantidade de membros vinculados',
  })
  membersCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    group: SmallGroup,
    options?: { membersCount?: number },
  ): SmallGroupResponseDto {
    const dto = new SmallGroupResponseDto();
    dto.id = group.id;
    dto.congregationId = group.congregationId;
    dto.name = group.name;
    dto.description = group.description;
    dto.leaderMemberId = group.leaderMemberId;
    dto.leader = group.leaderMember
      ? {
          id: group.leaderMember.id,
          fullName: group.leaderMember.fullName,
        }
      : null;
    dto.address = group.address;
    dto.dayOfWeek = group.dayOfWeek;
    dto.startTime = group.startTime;
    dto.status = group.status;
    dto.createdAt = group.createdAt;
    dto.updatedAt = group.updatedAt;
    if (options?.membersCount !== undefined) {
      dto.membersCount = options.membersCount;
    }
    return dto;
  }
}

export class PaginatedSmallGroupsResponseDto {
  @ApiProperty({ type: SmallGroupResponseDto, isArray: true })
  data!: SmallGroupResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class SmallGroupLeaderOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}
