import { IEbdClass } from '@interfaces/IEbdClass';

/** Espelha PaginatedClassesResponseDto do backend. */
export interface IPaginatedEbdClasses {
  data: IEbdClass[];
  total: number;
  page: number;
  limit: number;
}
