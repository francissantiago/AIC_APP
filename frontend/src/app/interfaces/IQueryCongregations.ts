import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';

/** Espelha QueryCongregationsDto do backend. */
export interface IQueryCongregations {
  page?: number;
  limit?: number;
  type?: CongregationType;
  status?: CongregationStatus;
  q?: string;
}
