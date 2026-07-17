/** Espelha RoleResponseDto do backend. */
export interface IRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
}
