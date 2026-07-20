import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

const TOKEN_STORAGE_KEY = 'aic.accessToken';
const authFile = path.join(__dirname, '../.auth/admin.json');
const baseOrigin = process.env.E2E_BASE_URL ?? 'http://localhost:83';

function readAccessToken(): string {
  const state = JSON.parse(readFileSync(authFile, 'utf-8')) as {
    origins: Array<{
      origin: string;
      sessionStorage?: Array<{ name: string; value: string }>;
    }>;
  };

  const origin = state.origins.find((entry) => entry.origin === baseOrigin);
  const token = origin?.sessionStorage?.find((entry) => entry.name === TOKEN_STORAGE_KEY)?.value;

  if (!token) {
    throw new Error('Token E2E ausente em .auth/admin.json. Execute o project setup primeiro.');
  }

  return token;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const token = readAccessToken();
    await page.addInitScript(
      ([key, value]) => {
        sessionStorage.setItem(key, value);
      },
      [TOKEN_STORAGE_KEY, token] as const,
    );
    await use(page);
  },
});

export { expect };
