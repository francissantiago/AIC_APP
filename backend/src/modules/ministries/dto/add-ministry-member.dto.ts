import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MinistryMemberRole } from '../enums/ministry-member-role.enum';

export class AddMinistryMemberDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    enum: MinistryMemberRole,
    default: MinistryMemberRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(MinistryMemberRole)
  role?: MinistryMemberRole;

  @ApiPropertyOptional({ example: '2026-07-18T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
