import { CongregationType } from '@enums/congregation-type';

/** Espelha UserCongregationResponseDto do backend. */
export interface IUserCongregation {
  congregationId: string;
  congregationName: string;
  congregationType: CongregationType;
  isDefault: boolean;
  assignedAt: string;
}
