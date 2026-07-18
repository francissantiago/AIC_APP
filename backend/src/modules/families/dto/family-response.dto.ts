import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Family } from '../entities/family.entity';

export class FamilyResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'Família Silva' })
  name!: string;

  @ApiPropertyOptional({ example: 'Observações pastorais', nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
  })
  headMemberId!: string | null;

  @ApiPropertyOptional({ example: 'Maria da Silva', nullable: true })
  headMemberName!: string | null;

  @ApiPropertyOptional({ example: 4 })
  membersCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    family: Family,
    options?: { membersCount?: number },
  ): FamilyResponseDto {
    const dto = new FamilyResponseDto();
    dto.id = family.id;
    dto.congregationId = family.congregationId;
    dto.name = family.name;
    dto.notes = family.notes;
    dto.headMemberId = family.headMemberId;
    dto.headMemberName = family.headMember?.fullName ?? null;
    dto.createdAt = family.createdAt;
    dto.updatedAt = family.updatedAt;
    if (options?.membersCount !== undefined) {
      dto.membersCount = options.membersCount;
    }
    return dto;
  }
}

export class PaginatedFamiliesResponseDto {
  @ApiProperty({ type: FamilyResponseDto, isArray: true })
  data!: FamilyResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
