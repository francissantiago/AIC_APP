import { MemberGender } from '@enums/member-gender';
import { MemberMaritalStatus } from '@enums/member-marital-status';
import { MemberStatus } from '@enums/member-status';

/** Espelha CreateMemberDto do backend. */
export interface ICreateMember {
  fullName: string;
  email?: string;
  phone?: string;
  document?: string;
  birthDate?: string;
  gender?: MemberGender;
  maritalStatus?: MemberMaritalStatus;
  status?: MemberStatus;
  baptismDate?: string;
  membershipDate?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  rg?: string;
  placeOfBirth?: string;
  bloodType?: string;
  fatherName?: string;
  motherName?: string;
  positionTitle?: string;
  userId?: string;
}
