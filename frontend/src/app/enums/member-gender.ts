export enum MemberGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNSPECIFIED = 'unspecified',
}

export const MEMBER_GENDERS = [
  MemberGender.MALE,
  MemberGender.FEMALE,
  MemberGender.OTHER,
  MemberGender.UNSPECIFIED,
] as const;
