/** Espelha JwtPayload do backend (somente leitura local). */
export interface IJwtPayload {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  defaultCongregationId?: string;
  purpose?: '2fa';
}
