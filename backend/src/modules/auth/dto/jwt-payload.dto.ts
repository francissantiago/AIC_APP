export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  defaultCongregationId?: string;
  /** Token version — invalida sessões após logout/changePassword. */
  tv?: number;
  purpose?: '2fa';
}
