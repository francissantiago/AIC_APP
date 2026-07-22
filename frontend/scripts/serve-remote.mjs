/**
 * Starts `ng serve` with HMR WebSocket aimed at the public HTTPS reverse-proxy host.
 * Requires the proxy to forward WebSocket upgrades to this process.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

process.env.AIC_DEV_PUBLIC_HOST ||= 'dev-application.lightburden.net';
process.env.AIC_HMR_PROTOCOL ||= 'wss';
process.env.AIC_HMR_CLIENT_PORT ||= '443';

const args = [
  'serve',
  '--configuration',
  'development',
  '--port',
  '83',
  '--host',
  '0.0.0.0',
  ...process.argv.slice(2),
];

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
