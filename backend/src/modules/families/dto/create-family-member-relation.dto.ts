import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';

export class CreateFamilyMemberRelationDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  fromMemberId!: string;

  @ApiProperty({ example: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff' })
  @IsUUID()
  toMemberId!: string;

  @ApiProperty({ enum: FamilyMemberLinkRelation })
  @IsEnum(FamilyMemberLinkRelation)
  relation!: FamilyMemberLinkRelation;
}
