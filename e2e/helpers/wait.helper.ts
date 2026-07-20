import type { Page } from '@playwright/test';

export async function waitForAppShell(page: Page): Promise<void> {
  await page.getByTestId('app-sidebar').waitFor({ state: 'visible' });
  await page.getByTestId('app-main').waitFor({ state: 'visible' });
}

export async function waitForRoute(page: Page, path: string): Promise<void> {
  await page.waitForURL((url) => url.pathname === path || url.pathname.startsWith(`${path}/`));
  await waitForAppShell(page);
}
