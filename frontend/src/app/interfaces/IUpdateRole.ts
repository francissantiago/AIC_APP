/** Espelha UpdateRoleDto do backend (code imutável). */
export interface IUpdateRole {
  name?: string;
  description?: string | null;
  /** Se informado, substitui por completo o conjunto de permissões do papel (replace). */
  permissionIds?: number[];
}
