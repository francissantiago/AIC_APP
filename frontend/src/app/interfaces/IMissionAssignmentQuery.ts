import { MissionAssignmentRole } from '@enums/mission-assignment-role';
import { MissionAssignmentStatus } from '@enums/mission-assignment-status';
import { IMissionAssignment } from '@interfaces/IMissionAssignment';

export interface ICreateMissionAssignment {
  memberId: string;
  missionFieldId: string;
  role?: MissionAssignmentRole;
  status?: MissionAssignmentStatus;
  startDate: string;
  expectedEndDate?: string;
  notes?: string;
}

export interface IUpdateMissionAssignment {
  memberId?: string;
  missionFieldId?: string;
  role?: MissionAssignmentRole;
  status?: MissionAssignmentStatus;
  startDate?: string;
  expectedEndDate?: string | null;
  actualEndDate?: string | null;
  notes?: string | null;
}

export interface IQueryMissionAssignments {
  page?: number;
  limit?: number;
  q?: string;
  status?: MissionAssignmentStatus;
  role?: MissionAssignmentRole;
  missionFieldId?: string;
  memberId?: string;
}

export interface IPaginatedMissionAssignments {
  data: IMissionAssignment[];
  total: number;
  page: number;
  limit: number;
}
