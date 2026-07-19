import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';

/** Espelha CongregationResponseDto do backend. */
export interface ICongregation {
  id: string;
  name: string;
  tradeName: string | null;
  type: CongregationType;
  parentId: string | null;
  branchesCount?: number;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  foundationDate: string | null;
  website: string | null;
  status: CongregationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
