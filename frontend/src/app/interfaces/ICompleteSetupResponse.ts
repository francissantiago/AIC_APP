import { CongregationType } from '@enums/congregation-type';

/** Espelha SetupUserResponseDto do backend. */
export interface ISetupUserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
}

/** Espelha SetupCongregationResponseDto do backend. */
export interface ISetupCongregationResponse {
  id: string;
  name: string;
  type: CongregationType;
}

/** Espelha CompleteSetupResponseDto do backend (POST /api/setup). */
export interface ICompleteSetupResponse {
  needsSetup: boolean;
  user: ISetupUserResponse;
  congregation: ISetupCongregationResponse;
}
