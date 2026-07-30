import { ApiProperty } from '@nestjs/swagger';
import { FamilyMemberRelation } from '../entities/family-member-relation.entity';
import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';

export class FamilyMemberRelationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  familyId!: string;

  @ApiProperty({ format: 'uuid' })
  fromMemberId!: string;

  @ApiProperty({ example: 'João da Silva' })
  fromMemberFullName!: string;

  @ApiProperty({ format: 'uuid' })
  toMemberId!: string;

  @ApiProperty({ example: 'Pedro da Silva' })
  toMemberFullName!: string;

  @ApiProperty({ enum: FamilyMemberLinkRelation })
  relation!: FamilyMemberLinkRelation;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(
    relation: FamilyMemberRelation,
  ): FamilyMemberRelationResponseDto {
    const dto = new FamilyMemberRelationResponseDto();
    dto.id = relation.id;
    dto.familyId = relation.familyId;
    dto.fromMemberId = relation.fromMemberId;
    dto.fromMemberFullName = relation.fromMember?.fullName ?? '';
    dto.toMemberId = relation.toMemberId;
    dto.toMemberFullName = relation.toMember?.fullName ?? '';
    dto.relation = relation.relation;
    dto.createdAt = relation.createdAt;
    return dto;
  }
}

export class FamilyMemberRelationListResponseDto {
  @ApiProperty({ type: FamilyMemberRelationResponseDto, isArray: true })
  data!: FamilyMemberRelationResponseDto[];
}
