import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SocialProjectMemberRole } from '../enums/social-project-member-role.enum';

export class AddSocialProjectMemberDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    enum: SocialProjectMemberRole,
    default: SocialProjectMemberRole.PARTICIPANT,
  })
  @IsOptional()
  @IsEnum(SocialProjectMemberRole)
  role?: SocialProjectMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
