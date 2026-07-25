import { MissionAssignmentRole } from '@enums/mission-assignment-role';
import { MissionAssignmentStatus } from '@enums/mission-assignment-status';

/** Espelha MissionAssignmentResponseDto do backend. */
export interface IMissionAssignment {
  id: string;
  congregationId: string;
  memberId: string;
  memberName: string;
  missionFieldId: string;
  missionFieldName: string;
  role: MissionAssignmentRole;
  status: MissionAssignmentStatus;
  startDate: string;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
