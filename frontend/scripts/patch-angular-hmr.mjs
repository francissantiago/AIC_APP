/**
 * Patches @angular/build Vite server config so HMR works behind an HTTPS reverse proxy.
 *
 * Env (optional):
 * - AIC_DEV_PUBLIC_HOST  public hostname (e.g. dev-application.lightburden.net)
 * - AIC_HMR_PROTOCOL     wss | ws (default: wss when host is set)
 * - AIC_HMR_CLIENT_PORT  port the browser should use (default: 443 for wss)
 *
 * The reverse proxy MUST upgrade WebSockets (Upgrade/Connection headers).
 * If it cannot, use: npm run dev:no-hmr
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = join(
  root,
  'node_modules/@angular/build/src/builders/dev-server/vite/server.js',
);

const marker = 'AIC_PATCH: reverse-proxy HMR ws';
let source = readFileSync(serverPath, 'utf8');

if (source.includes(marker)) {
  console.log('[patch-angular-hmr] already applied');
  process.exit(0);
}

const from = `        // Disable the websocket if live reload is disabled (false/undefined are the only valid values)
        ws: serverOptions.liveReload === false && serverOptions.hmr === false ? false : undefined,`;

const to = `        // Disable the websocket if live reload is disabled (false/undefined are the only valid values)
        // ${marker}
        ws: (() => {
            if (serverOptions.liveReload === false && serverOptions.hmr === false) {
                return false;
            }
            const publicHost = process.env.AIC_DEV_PUBLIC_HOST?.trim();
            if (!publicHost) {
                return undefined;
            }
            const protocol = (process.env.AIC_HMR_PROTOCOL?.trim() || 'wss');
            const clientPort = Number(process.env.AIC_HMR_CLIENT_PORT || (protocol === 'wss' ? 443 : 80));
            return {
                host: publicHost,
                protocol,
                clientPort: Number.isFinite(clientPort) ? clientPort : undefined,
            };
        })(),`;

if (!source.includes(from)) {
  console.warn('[patch-angular-hmr] pattern not found; skip');
  process.exit(0);
}

source = source.replace(from, to);
writeFileSync(serverPath, source);
console.log('[patch-angular-hmr] reverse-proxy HMR ws applied');
