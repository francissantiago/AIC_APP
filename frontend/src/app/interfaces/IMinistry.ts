import { MinistryStatus } from '@enums/ministry-status';

/** Espelha MinistryResponseDto do backend. */
export interface IMinistry {
  id: string;
  congregationId: string;
  name: string;
  description: string | null;
  leaderMemberId: string | null;
  leaderFullName: string | null;
  status: MinistryStatus;
  membersCount?: number;
  createdAt: string;
  updatedAt: string;
}
