import { APP_VERSION, APP_BUILT_AT } from './version.generated';
import { applyRuntimeConfig as applyPatch } from './runtime-config';
import type { AppRuntimeConfigPatch } from './runtime-config';

export type { AppRuntimeConfigPatch } from './runtime-config';

export const environment = {
  production: false,
  /** Relativo: mesmo host do tunnel/dev-server; proxy encaminha para o Nest. */
  apiUrl: '/api',
  /** Origem do Socket.IO. Dev: '' = same-origin (proxy `/socket.io`). */
  wsUrl: '',
  version: APP_VERSION,
  builtAt: APP_BUILT_AT,
  /** Intervalo de polling para nova versão (ms). 0 = desabilitado. */
  versionCheckIntervalMs: 10 * 60 * 1000,
};

export function applyRuntimeConfig(patch: AppRuntimeConfigPatch): void {
  applyPatch(environment, patch);
}
