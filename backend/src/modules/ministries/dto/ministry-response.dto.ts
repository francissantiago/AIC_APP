import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Ministry } from '../entities/ministry.entity';
import { MinistryStatus } from '../enums/ministry-status.enum';

export class MinistryResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'Louvor' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Equipe de louvor e adoração',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
  })
  leaderMemberId!: string | null;

  @ApiPropertyOptional({ example: 'Maria da Silva', nullable: true })
  leaderFullName!: string | null;

  @ApiProperty({ enum: MinistryStatus, example: MinistryStatus.ACTIVE })
  status!: MinistryStatus;

  @ApiPropertyOptional({ example: 12 })
  membersCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    ministry: Ministry,
    options?: { membersCount?: number },
  ): MinistryResponseDto {
    const dto = new MinistryResponseDto();
    dto.id = ministry.id;
    dto.congregationId = ministry.congregationId;
    dto.name = ministry.name;
    dto.description = ministry.description;
    dto.leaderMemberId = ministry.leaderMemberId;
    dto.leaderFullName = ministry.leaderMember?.fullName ?? null;
    dto.status = ministry.status;
    dto.createdAt = ministry.createdAt;
    dto.updatedAt = ministry.updatedAt;
    if (options?.membersCount !== undefined) {
      dto.membersCount = options.membersCount;
    }
    return dto;
  }
}

export class PaginatedMinistriesResponseDto {
  @ApiProperty({ type: MinistryResponseDto, isArray: true })
  data!: MinistryResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
