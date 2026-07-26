import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SocialProjectMemberRole } from '../enums/social-project-member-role.enum';

export class UpdateSocialProjectMemberDto {
  @ApiProperty({ enum: SocialProjectMemberRole })
  @IsEnum(SocialProjectMemberRole)
  role!: SocialProjectMemberRole;
}
