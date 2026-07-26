import { MissionBookletDestinationType } from '@enums/mission-booklet-destination-type';
import { MissionBookletInstallmentStatus } from '@enums/mission-booklet-installment-status';
import { MissionBookletStatus } from '@enums/mission-booklet-status';

export interface IMissionBooklet {
  id: string;
  congregationId: string;
  memberId: string;
  memberName: string;
  destinationType: MissionBookletDestinationType;
  missionFieldId: string | null;
  missionFieldName: string | null;
  missionAssignmentId: string | null;
  missionAssignmentLabel: string | null;
  title: string | null;
  installmentCount: number;
  installmentAmount: string;
  totalAmount: string;
  firstDueDate: string;
  status: MissionBookletStatus;
  notes: string | null;
  createdByUserId: string;
  paidCount?: number;
  pendingCount?: number;
  totalPaid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMissionBookletInstallment {
  id: string;
  bookletId: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
  status: MissionBookletInstallmentStatus;
  paidAt: string | null;
  financialEntryId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
