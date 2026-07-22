import { MemberGender } from '@enums/member-gender';
import { MemberMaritalStatus } from '@enums/member-marital-status';
import { MemberStatus } from '@enums/member-status';

/** Espelha MemberResponseDto do backend. */
export interface IMember {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  birthDate: string | null;
  gender: MemberGender;
  maritalStatus: MemberMaritalStatus;
  status: MemberStatus;
  baptismDate: string | null;
  membershipDate: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  rg: string | null;
  registrationNumber: string | null;
  placeOfBirth: string | null;
  bloodType: string | null;
  fatherName: string | null;
  motherName: string | null;
  positionTitle: string | null;
  photoUrl: string | null;
  userId: string | null;
  congregationId: string;
  createdAt: string;
  updatedAt: string;
}
