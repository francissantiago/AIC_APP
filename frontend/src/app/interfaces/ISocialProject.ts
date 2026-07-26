import { SocialProjectCategory } from '@enums/social-project-category';
import { SocialProjectStatus } from '@enums/social-project-status';

/** Espelha SocialProjectResponseDto do backend. */
export interface ISocialProject {
  id: string;
  congregationId: string;
  name: string;
  description: string | null;
  category: SocialProjectCategory;
  leaderMemberId: string | null;
  leaderFullName: string | null;
  dayOfWeek: number;
  startTime: string | null;
  location: string | null;
  budgetAmount: string | null;
  spentAmount: string;
  budgetUsagePercent: number | null;
  status: SocialProjectStatus;
  membersCount?: number;
  sessionsCount?: number;
  expensesCount?: number;
  createdAt: string;
  updatedAt: string;
}
