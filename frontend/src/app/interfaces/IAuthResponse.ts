import { IUser } from '@interfaces/IUser';

/** Espelha AuthResponseDto do backend (POST /api/auth/login). */
export interface IAuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: IUser;
}
