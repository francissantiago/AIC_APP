/** Espelha ChangePasswordDto (PATCH /api/auth/me/password). */
export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
