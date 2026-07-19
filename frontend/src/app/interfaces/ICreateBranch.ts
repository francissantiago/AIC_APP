import { CongregationStatus } from '@enums/congregation-status';

/** Espelha CreateBranchDto do backend. */
export interface ICreateBranch {
  name: string;
  parentId?: string;
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
  status?: CongregationStatus;
  notes?: string;
}
