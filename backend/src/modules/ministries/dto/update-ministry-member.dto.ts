import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MinistryMemberRole } from '../enums/ministry-member-role.enum';

export class UpdateMinistryMemberDto {
  @ApiProperty({ enum: MinistryMemberRole })
  @IsEnum(MinistryMemberRole)
  role!: MinistryMemberRole;
}
