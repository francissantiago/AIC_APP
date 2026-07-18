import { IAuthResponse } from '@interfaces/IAuthResponse';
import { ILoginTwoFactorChallenge } from '@interfaces/ILoginTwoFactorChallenge';

/** União tipada da resposta de POST /api/auth/login. */
export type ILoginResult = IAuthResponse | ILoginTwoFactorChallenge;

export function isTwoFactorChallenge(result: ILoginResult): result is ILoginTwoFactorChallenge {
  return (
    'requiresTwoFactor' in result &&
    result.requiresTwoFactor === true &&
    typeof result.preAuthToken === 'string'
  );
}
