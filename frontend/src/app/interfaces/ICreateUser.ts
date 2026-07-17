import { UserStatus } from '@enums/user-status';

/** Espelha CreateUserDto do backend. */
export interface ICreateUser {
  username: string;
  email: string;
  fullName: string;
  password: string;
  status?: UserStatus;
  roleIds: number[];
}
