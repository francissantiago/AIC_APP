import { MissionBookletDestinationType } from '@enums/mission-booklet-destination-type';
import { MissionBookletStatus } from '@enums/mission-booklet-status';
import { PaymentMethod } from '@enums/finance';
import { IMissionBooklet, IMissionBookletInstallment } from '@interfaces/IMissionBooklet';

export interface IQueryMissionBooklets {
  page?: number;
  limit?: number;
  q?: string;
  status?: MissionBookletStatus;
  destinationType?: MissionBookletDestinationType;
  memberId?: string;
  missionFieldId?: string;
}

export interface IPaginatedMissionBooklets {
  data: IMissionBooklet[];
  total: number;
  page: number;
  limit: number;
}

export interface ICreateMissionBooklet {
  memberId: string;
  destinationType: MissionBookletDestinationType;
  missionFieldId?: string;
  missionAssignmentId?: string;
  title?: string;
  installmentCount: number;
  installmentAmount: number;
  firstDueDate: string;
  notes?: string;
}

export interface IUpdateMissionBooklet {
  title?: string | null;
  notes?: string | null;
}

export interface IPayMissionBookletInstallment {
  paymentMethod: PaymentMethod;
  paidAt?: string;
  notes?: string;
}

export type { IMissionBooklet, IMissionBookletInstallment };
