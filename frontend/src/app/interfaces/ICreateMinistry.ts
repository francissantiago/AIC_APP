import { MinistryStatus } from '@enums/ministry-status';

/** Espelha CreateMinistryDto do backend. */
export interface ICreateMinistry {
  name: string;
  description?: string;
  leaderMemberId?: string;
  status?: MinistryStatus;
}
