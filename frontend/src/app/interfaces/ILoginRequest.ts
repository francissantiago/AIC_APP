/** Espelha LoginDto do backend (POST /api/auth/login). */
export interface ILoginRequest {
  email: string;
  password: string;
}
