import { SocialProjectMemberRole } from '@enums/social-project-member-role';

/** Espelha SocialProjectMemberResponseDto do backend. */
export interface ISocialProjectMember {
  socialProjectId: string;
  memberId: string;
  memberFullName: string;
  role: SocialProjectMemberRole;
  joinedAt: string;
}

export interface IPaginatedSocialProjectMembers {
  data: ISocialProjectMember[];
  total: number;
  page: number;
  limit: number;
}
