import { MemberMaritalStatus } from '@enums/member-marital-status';

/** Espelha MembershipCardResponseDto do backend. */
export interface IMembershipCardFront {
  fullName: string;
  filiation: string | null;
  birthDate: string | null;
  placeOfBirth: string | null;
  positionTitle: string | null;
  bloodType: string | null;
  photoUrl: string | null;
}

export interface IMembershipCardBack {
  cpf: string | null;
  rg: string | null;
  maritalStatus: MemberMaritalStatus;
  validUntil: string;
}

export interface IMembershipCardInstitution {
  headerLine1: string;
  headerLine2: string | null;
  ministryLabel: string | null;
  presidentName: string | null;
  presidentTitle: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  footerNotice: string;
}

export interface IMembershipCard {
  memberId: string;
  issuedAt: string;
  validUntil: string;
  front: IMembershipCardFront;
  back: IMembershipCardBack;
  institution: IMembershipCardInstitution;
  missingFields: string[];
  warnings: string[];
}

/** Espelha MembershipCardSettingsResponseDto. */
export interface IMembershipCardSettings {
  id: string;
  congregationId: string;
  headerLine1: string;
  headerLine2: string | null;
  ministryLabel: string | null;
  presidentName: string | null;
  presidentTitle: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  validityMonths: number;
  footerNotice: string;
  createdAt: string;
  updatedAt: string;
}

/** Espelha UpdateMembershipCardSettingsDto. */
export interface IUpdateMembershipCardSettings {
  headerLine1?: string;
  headerLine2?: string | null;
  ministryLabel?: string | null;
  presidentName?: string | null;
  presidentTitle?: string;
  validityMonths?: number;
  footerNotice?: string;
}
