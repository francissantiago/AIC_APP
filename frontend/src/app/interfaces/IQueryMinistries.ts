import { MinistryStatus } from '@enums/ministry-status';

/** Espelha QueryMinistriesDto do backend. */
export interface IQueryMinistries {
  page?: number;
  limit?: number;
  q?: string;
  status?: MinistryStatus;
  memberId?: string;
}
