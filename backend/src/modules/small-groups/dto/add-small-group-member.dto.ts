import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SmallGroupMemberRole } from '../enums/small-group-member-role.enum';
import { SmallGroupMemberStatus } from '../enums/small-group-member-status.enum';

export class AddSmallGroupMemberDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    enum: SmallGroupMemberRole,
    default: SmallGroupMemberRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(SmallGroupMemberRole)
  role?: SmallGroupMemberRole;

  @ApiPropertyOptional({
    enum: SmallGroupMemberStatus,
    default: SmallGroupMemberStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SmallGroupMemberStatus)
  status?: SmallGroupMemberStatus;

  @ApiPropertyOptional({ example: '2026-07-18T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
