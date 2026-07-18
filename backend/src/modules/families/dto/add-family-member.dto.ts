import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { FamilyRelation } from '../enums/family-relation.enum';

export class AddFamilyMemberDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    enum: FamilyRelation,
    default: FamilyRelation.OTHER,
  })
  @IsOptional()
  @IsEnum(FamilyRelation)
  relation?: FamilyRelation;
}
