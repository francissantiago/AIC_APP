export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  purpose?: '2fa';
}
