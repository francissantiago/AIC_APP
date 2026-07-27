export interface AppRuntimeConfigPatch {
  apiUrl?: string;
  wsUrl?: string;
  versionCheckIntervalMs?: number;
}

export function applyRuntimeConfig(
  target: AppRuntimeConfigPatch & {
    apiUrl: string;
    wsUrl: string;
    versionCheckIntervalMs: number;
  },
  patch: AppRuntimeConfigPatch,
): void {
  if (typeof patch.apiUrl === 'string') {
    target.apiUrl = patch.apiUrl;
  }
  if (typeof patch.wsUrl === 'string') {
    target.wsUrl = patch.wsUrl;
  }
  if (typeof patch.versionCheckIntervalMs === 'number') {
    target.versionCheckIntervalMs = patch.versionCheckIntervalMs;
  }
}
