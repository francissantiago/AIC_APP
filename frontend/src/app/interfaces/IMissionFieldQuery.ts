import { MissionFieldStatus } from '@enums/mission-field-status';
import { IMissionField } from '@interfaces/IMissionField';

export interface ICreateMissionField {
  name: string;
  country: string;
  description?: string;
  city?: string;
  region?: string;
  coordinatorMemberId?: string;
  status?: MissionFieldStatus;
}

export interface IUpdateMissionField {
  name?: string;
  country?: string;
  description?: string | null;
  city?: string | null;
  region?: string | null;
  coordinatorMemberId?: string | null;
  status?: MissionFieldStatus;
}

export interface IQueryMissionFields {
  page?: number;
  limit?: number;
  q?: string;
  status?: MissionFieldStatus;
  country?: string;
}

export interface IPaginatedMissionFields {
  data: IMissionField[];
  total: number;
  page: number;
  limit: number;
}
