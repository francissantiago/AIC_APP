import { IUser } from '@interfaces/IUser';

/** Espelha PaginatedUsersResponseDto do backend. */
export interface IPaginatedUsers {
  data: IUser[];
  total: number;
  page: number;
  limit: number;
}
