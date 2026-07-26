export enum SocialProjectCategory {
  MUSIC = 'music',
  SPORTS = 'sports',
  COMPUTING = 'computing',
  OTHER = 'other',
}

export const SOCIAL_PROJECT_CATEGORIES = [
  SocialProjectCategory.MUSIC,
  SocialProjectCategory.SPORTS,
  SocialProjectCategory.COMPUTING,
  SocialProjectCategory.OTHER,
] as const;
