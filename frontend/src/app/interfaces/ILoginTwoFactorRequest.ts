/** Espelha LoginTwoFactorDto (POST /api/auth/login/2fa). */
export interface ILoginTwoFactorRequest {
  preAuthToken: string;
  code: string;
}
