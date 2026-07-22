/** Espelha MembershipCardVerifyResponseDto. */
export interface IMembershipCardVerify {
  valid: boolean;
  memberId: string | null;
  registrationNumber: string | null;
  fullName: string | null;
  status: string | null;
  congregationName: string | null;
  birthDate: string | null;
  message: string | null;
}
