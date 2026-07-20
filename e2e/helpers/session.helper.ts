import type { Page } from '@playwright/test';

export const TOKEN_STORAGE_KEY = 'aic.accessToken';

export async function injectSessionToken(page: Page, token: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      sessionStorage.setItem(key, value);
    },
    [TOKEN_STORAGE_KEY, token] as const,
  );
}

export function getApiUrl(): string {
  return process.env.E2E_API_URL ?? 'http://localhost:3002/api';
}
