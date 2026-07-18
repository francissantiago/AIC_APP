import { MinistryStatus } from '@enums/ministry-status';

/** Espelha UpdateMinistryDto do backend (parcial; null limpa líder). */
export interface IUpdateMinistry {
  name?: string;
  description?: string | null;
  leaderMemberId?: string | null;
  status?: MinistryStatus;
}
