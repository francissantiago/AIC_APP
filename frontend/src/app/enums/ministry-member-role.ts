export enum MinistryMemberRole {
  LEADER = 'leader',
  ASSISTANT = 'assistant',
  MEMBER = 'member',
}

export const MINISTRY_MEMBER_ROLES = [
  MinistryMemberRole.LEADER,
  MinistryMemberRole.ASSISTANT,
  MinistryMemberRole.MEMBER,
] as const;
