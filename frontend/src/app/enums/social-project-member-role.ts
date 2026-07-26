export enum SocialProjectMemberRole {
  LEADER = 'leader',
  ASSISTANT = 'assistant',
  PARTICIPANT = 'participant',
}

export const SOCIAL_PROJECT_MEMBER_ROLES = [
  SocialProjectMemberRole.LEADER,
  SocialProjectMemberRole.ASSISTANT,
  SocialProjectMemberRole.PARTICIPANT,
] as const;
