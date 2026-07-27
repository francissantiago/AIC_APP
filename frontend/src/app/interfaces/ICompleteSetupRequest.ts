/** Espelha SetupAdminDto do backend. */
export interface ISetupAdminRequest {
  username: string;
  email: string;
  fullName: string;
  password: string;
}

/** Espelha SetupCongregationDto do backend; opcionais são omitidos quando vazios. */
export interface ISetupCongregationRequest {
  name: string;
  tradeName?: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  foundationDate?: string;
  website?: string;
}

/** Espelha CompleteSetupDto do backend (POST /api/setup). */
export interface ICompleteSetupRequest {
  admin: ISetupAdminRequest;
  congregation: ISetupCongregationRequest;
}
