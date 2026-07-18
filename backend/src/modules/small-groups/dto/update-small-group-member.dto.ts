import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SmallGroupMemberRole } from '../enums/small-group-member-role.enum';
import { SmallGroupMemberStatus } from '../enums/small-group-member-status.enum';

export class UpdateSmallGroupMemberDto {
  @ApiPropertyOptional({ enum: SmallGroupMemberRole })
  @IsOptional()
  @IsEnum(SmallGroupMemberRole)
  role?: SmallGroupMemberRole;

  @ApiPropertyOptional({ enum: SmallGroupMemberStatus })
  @IsOptional()
  @IsEnum(SmallGroupMemberStatus)
  status?: SmallGroupMemberStatus;
}
