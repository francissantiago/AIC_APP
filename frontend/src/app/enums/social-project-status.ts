export enum SocialProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const SOCIAL_PROJECT_STATUSES = [
  SocialProjectStatus.ACTIVE,
  SocialProjectStatus.INACTIVE,
] as const;
