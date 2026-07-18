export enum AnnouncementAudience {
  ALL = 'all',
  ROLES = 'roles',
  MINISTRIES = 'ministries',
}

/** MVP: formulário só permite `all`. Valores futuros documentados no enum. */
export const ANNOUNCEMENT_AUDIENCES_MVP = [AnnouncementAudience.ALL] as const;
