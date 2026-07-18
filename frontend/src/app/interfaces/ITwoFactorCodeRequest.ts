/** Espelha TwoFactorCodeDto (POST /api/auth/me/2fa/verify). */
export interface ITwoFactorCodeRequest {
  code: string;
}
