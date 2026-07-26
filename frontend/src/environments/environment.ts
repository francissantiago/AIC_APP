import { APP_VERSION, APP_BUILT_AT } from './version.generated';

export const environment = {
  production: true,
  apiUrl: '/api',
  /** Origem do Socket.IO. Same-origin (reverse proxy): ''; senão origem do host da API. */
  wsUrl: '',
  version: APP_VERSION,
  builtAt: APP_BUILT_AT,
  /** Intervalo de polling para nova versão (ms). 0 = desabilitado. */
  versionCheckIntervalMs: 5 * 60 * 1000,
};
