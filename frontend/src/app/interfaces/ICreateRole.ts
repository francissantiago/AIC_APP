/** Espelha CreateRoleDto do backend. */
export interface ICreateRole {
  code: string;
  name: string;
  description?: string | null;
  /** Ids de permissões concedidas ao papel; se omitido, papel nasce sem nenhuma permissão. */
  permissionIds?: number[];
}
