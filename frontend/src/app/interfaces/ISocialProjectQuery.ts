import { SocialProjectCategory } from '@enums/social-project-category';
import { SocialProjectStatus } from '@enums/social-project-status';
import { ISocialProject } from '@interfaces/ISocialProject';

export interface ISocialProjectQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: SocialProjectStatus;
  category?: SocialProjectCategory;
}

export interface ICreateSocialProject {
  name: string;
  description?: string;
  category?: SocialProjectCategory;
  leaderMemberId?: string;
  dayOfWeek?: number;
  startTime?: string;
  location?: string;
  budgetAmount?: number;
  status?: SocialProjectStatus;
}

export interface IUpdateSocialProject {
  name?: string;
  description?: string | null;
  category?: SocialProjectCategory;
  leaderMemberId?: string | null;
  dayOfWeek?: number;
  startTime?: string | null;
  location?: string | null;
  budgetAmount?: number | null;
  status?: SocialProjectStatus;
}

export interface IPaginatedSocialProjects {
  data: ISocialProject[];
  total: number;
  page: number;
  limit: number;
}

export interface IQuerySocialProjectMembers {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
}

export interface IAddSocialProjectMember {
  memberId: string;
  role?: string;
}

export interface IUpdateSocialProjectMember {
  role: string;
}
