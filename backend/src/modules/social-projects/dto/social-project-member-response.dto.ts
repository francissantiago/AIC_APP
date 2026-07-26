import { ApiProperty } from '@nestjs/swagger';
import { SocialProjectMember } from '../entities/social-project-member.entity';
import { SocialProjectMemberRole } from '../enums/social-project-member-role.enum';

export class SocialProjectMemberResponseDto {
  @ApiProperty()
  socialProjectId!: string;

  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  memberFullName!: string;

  @ApiProperty({ enum: SocialProjectMemberRole })
  role!: SocialProjectMemberRole;

  @ApiProperty()
  joinedAt!: Date;

  static fromEntity(link: SocialProjectMember): SocialProjectMemberResponseDto {
    const dto = new SocialProjectMemberResponseDto();
    dto.socialProjectId = link.socialProjectId;
    dto.memberId = link.memberId;
    dto.memberFullName = link.member?.fullName ?? '';
    dto.role = link.role;
    dto.joinedAt = link.joinedAt;
    return dto;
  }
}

export class PaginatedSocialProjectMembersResponseDto {
  @ApiProperty({ type: SocialProjectMemberResponseDto, isArray: true })
  data!: SocialProjectMemberResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
