/** Espelha PermissionResponseDto do backend. */
export interface IPermission {
  id: number;
  /** Formato recurso:ação, ex.: 'finance:write'. */
  code: string;
  resource: string;
  action: 'read' | 'write';
  description: string | null;
}
