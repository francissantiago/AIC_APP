import { UserStatus } from '@enums/user-status';

/** Espelha UpdateUserDto — sem username/password. */
export interface IUpdateUser {
  email?: string;
  fullName?: string;
  status?: UserStatus;
}
