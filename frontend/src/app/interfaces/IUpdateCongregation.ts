import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';

/** Espelha UpdateCongregationDto do backend (campos opcionais). */
export interface IUpdateCongregation {
  name?: string;
  tradeName?: string;
  type?: CongregationType;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  foundationDate?: string;
  website?: string;
  status?: CongregationStatus;
  notes?: string;
}
