/** Espelha DisableTwoFactorDto (POST /api/auth/me/2fa/disable). */
export interface IDisableTwoFactorRequest {
  password: string;
  code: string;
}
