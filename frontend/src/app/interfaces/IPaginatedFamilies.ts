import { IFamily } from '@interfaces/IFamily';

/** Espelha PaginatedFamiliesResponseDto do backend. */
export interface IPaginatedFamilies {
  data: IFamily[];
  total: number;
  page: number;
  limit: number;
}
