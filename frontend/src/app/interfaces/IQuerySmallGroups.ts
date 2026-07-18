import { SmallGroupStatus } from '@enums/small-group-status';

export interface IQuerySmallGroups {
  page?: number;
  limit?: number;
  q?: string;
  status?: SmallGroupStatus;
}
