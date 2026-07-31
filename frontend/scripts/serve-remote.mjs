/**
 * Starts `ng serve` for access via HTTPS reverse proxy
 * (e.g. https://dev-application.lightburden.net → localhost:83).
 *
 * HMR is OFF by default: many reverse proxies forward HTTP but do not upgrade
 * WebSockets, which floods the console with Vite WSS errors.
 *
 * Opt-in HMR when the proxy supports Upgrade/Connection:
 *   AIC_ENABLE_HMR=1 npm run dev:remote
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

process.env.AIC_DEV_PUBLIC_HOST ||= 'dev-application.lightburden.net';
process.env.AIC_HMR_PROTOCOL ||= 'wss';
process.env.AIC_HMR_CLIENT_PORT ||= '443';

const enableHmr = process.env.AIC_ENABLE_HMR === '1' || process.env.AIC_ENABLE_HMR === 'true';

const args = [
  'serve',
  '--configuration',
  'development',
  '--port',
  '83',
  '--host',
  '0.0.0.0',
  ...(enableHmr ? [] : ['--no-live-reload', '--hmr=false']),
  ...process.argv.slice(2),
];

if (!enableHmr) {
  console.log(
    '[serve-remote] HMR desligado (proxy sem WebSocket). ' +
      'Recarregue a página manualmente. Para tentar HMR: AIC_ENABLE_HMR=1 npm run dev:remote',
  );
} else {
  console.log(
    `[serve-remote] HMR em ${process.env.AIC_HMR_PROTOCOL}://${process.env.AIC_DEV_PUBLIC_HOST}:${process.env.AIC_HMR_CLIENT_PORT}`,
  );
}

const child = spawn('npx', ['ng', ...args], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
