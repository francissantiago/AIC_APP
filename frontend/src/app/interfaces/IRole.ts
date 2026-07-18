import { IPermission } from '@interfaces/IPermission';

/** Espelha RoleResponseDto do backend. */
export interface IRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  /** Derivado no backend a partir de SYSTEM_ROLE_CODES. */
  isSystem?: boolean;
  permissions: IPermission[];
}

/** Códigos seedados — fallback quando `isSystem` não vier na resposta. */
export const SYSTEM_ROLE_CODES = [
  'ADMIN',
  'PASTOR',
  'TREASURER',
  'SECRETARY',
  'LEADER',
  'MEMBER',
] as const;

export function isSystemRole(role: Pick<IRole, 'code' | 'isSystem'>): boolean {
  if (typeof role.isSystem === 'boolean') {
    return role.isSystem;
  }
  return (SYSTEM_ROLE_CODES as readonly string[]).includes(role.code);
}
