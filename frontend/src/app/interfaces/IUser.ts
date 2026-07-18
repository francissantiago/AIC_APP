import { UserStatus } from '@enums/user-status';
import { IRole } from '@interfaces/IRole';

/**
 * Espelha UserResponseDto do backend.
 * Datas chegam como ISO string no JSON Nest.
 */
export interface IUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  status: UserStatus;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: IRole[];
  /** Códigos de permissão deduplicados de todos os papéis do usuário. */
  permissions: string[];
}
