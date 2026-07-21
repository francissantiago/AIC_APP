export type GoogleCalendarSyncDirection = 'bidirectional' | 'aic_to_google' | 'google_to_aic';

export type GoogleCalendarConflictPolicy = 'aic_wins' | 'google_wins' | 'latest_wins';

export type GoogleCalendarConnectionStatusValue = 'active' | 'disconnected' | 'error' | 'revoked';

export interface IGoogleCalendarConnectionStatus {
  /** False when backend OAuth env is incomplete — hide Google Calendar UI. */
  configured: boolean;
  connected: boolean;
  status: GoogleCalendarConnectionStatusValue | null;
  email: string | null;
  googleCalendarId: string | null;
  syncDirection: GoogleCalendarSyncDirection | null;
  conflictPolicy: GoogleCalendarConflictPolicy | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface IGoogleCalendarOAuthUrl {
  url: string;
  state: string;
}

export interface IGoogleCalendarListItem {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
}

export interface IGoogleCalendarListResponse {
  items: IGoogleCalendarListItem[];
}

export interface IGoogleCalendarSettingsPatch {
  googleCalendarId?: string;
  syncDirection?: GoogleCalendarSyncDirection;
  conflictPolicy?: GoogleCalendarConflictPolicy;
}

export interface IGoogleCalendarSyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: number;
  warnings: string[];
}

export interface IGoogleCalendarDisconnectResponse {
  disconnected: boolean;
}
