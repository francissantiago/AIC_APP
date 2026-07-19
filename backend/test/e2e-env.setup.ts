import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(relativePath: string, override = false): void {
  const envPath = resolve(__dirname, relativePath);
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('../.env');
loadEnvFile('../.env.test', true);
