/** Espelha LoginTwoFactorChallengeDto (POST /api/auth/login com 2FA). */
export interface ILoginTwoFactorChallenge {
  requiresTwoFactor: true;
  preAuthToken: string;
  expiresIn: string;
}
