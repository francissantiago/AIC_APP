import { IMinistry } from '@interfaces/IMinistry';

/** Espelha PaginatedMinistriesResponseDto do backend. */
export interface IPaginatedMinistries {
  data: IMinistry[];
  total: number;
  page: number;
  limit: number;
}
