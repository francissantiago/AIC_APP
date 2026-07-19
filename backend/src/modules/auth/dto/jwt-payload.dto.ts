export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  defaultCongregationId?: string;
  purpose?: '2fa';
}
