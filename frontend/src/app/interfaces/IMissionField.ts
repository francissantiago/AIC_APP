import { MissionFieldStatus } from '@enums/mission-field-status';

/** Espelha MissionFieldResponseDto do backend. */
export interface IMissionField {
  id: string;
  congregationId: string;
  name: string;
  country: string;
  city: string | null;
  region: string | null;
  description: string | null;
  coordinatorMemberId: string | null;
  coordinatorMemberName: string | null;
  status: MissionFieldStatus;
  assignmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}
