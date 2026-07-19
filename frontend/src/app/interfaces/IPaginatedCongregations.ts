import { ICongregation } from '@interfaces/ICongregation';

export interface IPaginatedCongregations {
  data: ICongregation[];
  total: number;
  page: number;
  limit: number;
}
