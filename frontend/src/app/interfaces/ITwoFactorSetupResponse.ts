/** Espelha TwoFactorSetupResponseDto (POST /api/auth/me/2fa/setup). */
export interface ITwoFactorSetupResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
}
