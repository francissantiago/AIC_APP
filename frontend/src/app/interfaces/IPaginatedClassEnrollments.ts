import { IClassEnrollment } from '@interfaces/IClassEnrollment';

/** Espelha PaginatedClassEnrollmentsResponseDto do backend. */
export interface IPaginatedClassEnrollments {
  data: IClassEnrollment[];
  total: number;
  page: number;
  limit: number;
}
