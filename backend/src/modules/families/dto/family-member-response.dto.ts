import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FamilyMember } from '../entities/family-member.entity';
import { FamilyRelation } from '../enums/family-relation.enum';

export class FamilyMemberResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  familyId!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: FamilyRelation })
  relation!: FamilyRelation;

  @ApiProperty()
  joinedAt!: Date;

  @ApiPropertyOptional({ example: '1990-05-12', nullable: true })
  birthDate!: string | null;

  static fromEntity(link: FamilyMember): FamilyMemberResponseDto {
    const dto = new FamilyMemberResponseDto();
    dto.familyId = link.familyId;
    dto.memberId = link.memberId;
    dto.memberFullName = link.member?.fullName ?? '';
    dto.relation = link.relation;
    dto.joinedAt = link.joinedAt;
    dto.birthDate = link.member?.birthDate ?? null;
    return dto;
  }
}

export class PaginatedFamilyMembersResponseDto {
  @ApiProperty({ type: FamilyMemberResponseDto, isArray: true })
  data!: FamilyMemberResponseDto[];

  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
