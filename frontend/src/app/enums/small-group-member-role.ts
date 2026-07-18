export enum SmallGroupMemberRole {
  LEADER = 'leader',
  ASSISTANT = 'assistant',
  MEMBER = 'member',
}

export const SMALL_GROUP_MEMBER_ROLES = [
  SmallGroupMemberRole.LEADER,
  SmallGroupMemberRole.ASSISTANT,
  SmallGroupMemberRole.MEMBER,
] as const;
