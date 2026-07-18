import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { FamilyRelation } from '../enums/family-relation.enum';

export class UpdateFamilyMemberDto {
  @ApiProperty({ enum: FamilyRelation })
  @IsEnum(FamilyRelation)
  relation!: FamilyRelation;
}
