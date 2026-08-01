import { ConstructionProjectStatus } from '@enums/construction-project-status';

/** Espelha ConstructionProjectResponseDto do backend. */
export interface IConstructionProject {
  id: string;
  congregationId: string;
  name: string;
  description: string | null;
  location: string | null;
  status: ConstructionProjectStatus;
  progressPercent: number;
  budgetAmount: string | null;
  spentAmount: string;
  budgetUsagePercent: number | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  supervisorMemberId: string | null;
  supervisorMemberName: string | null;
  updatesCount?: number;
  photosCount?: number;
  expensesCount?: number;
  createdAt: string;
  updatedAt: string;
}
