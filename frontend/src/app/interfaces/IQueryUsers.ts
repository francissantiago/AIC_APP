import { UserStatus } from '@enums/user-status';

/** Espelha QueryUsersDto do backend. */
export interface IQueryUsers {
  page?: number;
  limit?: number;
  status?: UserStatus;
  roleCode?: string;
  q?: string;
}
