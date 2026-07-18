import { ISmallGroup } from '@interfaces/ISmallGroup';

export interface IPaginatedSmallGroups {
  data: ISmallGroup[];
  total: number;
  page: number;
  limit: number;
}
