import { MemberTransferStatus } from '@enums/member-transfer-status';
import { MemberStatus } from '@enums/member-status';

export interface ICreateMemberTransfer {
  destinationChurchName: string;
  destinationCity: string;
  notes?: string | null;
  completeNow?: boolean;
}

export interface IMemberTransferDocumentSummary {
  id: string;
  title: string;
  type: 'letter';
  status: 'draft' | 'final';
  documentDate: string;
  summary: string | null;
  hasFile: boolean;
}

export interface IMemberTransferMemberSummary {
  id: string;
  fullName: string;
  status: MemberStatus | string;
}

export interface IMemberTransfer {
  id: string;
  congregationId: string;
  memberId: string;
  destinationChurchName: string;
  destinationCity: string;
  requestedAt: string;
  approvedAt: string | null;
  status: MemberTransferStatus;
  documentId: string | null;
  notes: string | null;
  requestedByUserId: string;
  createdAt: string;
  updatedAt: string;
  document?: IMemberTransferDocumentSummary | null;
  member?: IMemberTransferMemberSummary | null;
}
