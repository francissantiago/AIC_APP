/**
 * Patches @angular/build Vite server config so HMR works behind an HTTPS reverse proxy.
 *
 * Vite 7 reads host/protocol/clientPort from `server.hmr` (not `server.ws`).
 * `server.ws` only accepts `false` to disable the websocket server.
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

const marker = 'AIC_PATCH: reverse-proxy HMR via server.hmr';
const legacyMarker = 'AIC_PATCH: reverse-proxy HMR ws';

const stockWsLine =
  '        // Disable the websocket if live reload is disabled (false/undefined are the only valid values)\n' +
  '        ws: serverOptions.liveReload === false && serverOptions.hmr === false ? false : undefined,';

const patchedBlock =
  '        // Disable the websocket if live reload is disabled (false/undefined are the only valid values)\n' +
  `        // ${marker}\n` +
  '        ws: serverOptions.liveReload === false && serverOptions.hmr === false ? false : undefined,\n' +
  '        hmr: (() => {\n' +
  '            if (serverOptions.liveReload === false && serverOptions.hmr === false) {\n' +
  '                return false;\n' +
  '            }\n' +
  '            const publicHost = process.env.AIC_DEV_PUBLIC_HOST?.trim();\n' +
  '            if (!publicHost) {\n' +
  '                return undefined;\n' +
  '            }\n' +
  "            const protocol = (process.env.AIC_HMR_PROTOCOL?.trim() || 'wss');\n" +
  "            const clientPort = Number(process.env.AIC_HMR_CLIENT_PORT || (protocol === 'wss' ? 443 : 80));\n" +
  '            return {\n' +
  '                host: publicHost,\n' +
  '                protocol,\n' +
  '                clientPort: Number.isFinite(clientPort) ? clientPort : undefined,\n' +
  '            };\n' +
  '        })(),';

const legacyPatchedBlock =
  '        // Disable the websocket if live reload is disabled (false/undefined are the only valid values)\n' +
  `        // ${legacyMarker}\n` +
  '        ws: (() => {\n' +
  '            if (serverOptions.liveReload === false && serverOptions.hmr === false) {\n' +
  '                return false;\n' +
  '            }\n' +
  '            const publicHost = process.env.AIC_DEV_PUBLIC_HOST?.trim();\n' +
  '            if (!publicHost) {\n' +
  '                return undefined;\n' +
  '            }\n' +
  "            const protocol = (process.env.AIC_HMR_PROTOCOL?.trim() || 'wss');\n" +
  "            const clientPort = Number(process.env.AIC_HMR_CLIENT_PORT || (protocol === 'wss' ? 443 : 80));\n" +
  '            return {\n' +
  '                host: publicHost,\n' +
  '                protocol,\n' +
  '                clientPort: Number.isFinite(clientPort) ? clientPort : undefined,\n' +
  '            };\n' +
  '        })(),';

let source = readFileSync(serverPath, 'utf8');

if (source.includes(marker)) {
  console.log('[patch-angular-hmr] already applied');
  process.exit(0);
}

if (source.includes(legacyPatchedBlock)) {
  source = source.replace(legacyPatchedBlock, patchedBlock);
  writeFileSync(serverPath, source);
  console.log('[patch-angular-hmr] upgraded legacy ws patch → server.hmr');
  process.exit(0);
}

if (source.includes(legacyMarker)) {
  console.warn(
    '[patch-angular-hmr] legacy patch marker found but block mismatch; restore @angular/build and re-run postinstall',
  );
  process.exit(0);
}

if (!source.includes(stockWsLine)) {
  console.warn('[patch-angular-hmr] pattern not found; skip');
  process.exit(0);
}

source = source.replace(stockWsLine, patchedBlock);
writeFileSync(serverPath, source);
console.log('[patch-angular-hmr] reverse-proxy HMR via server.hmr applied');
