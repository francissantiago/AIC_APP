import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

const TOKEN_STORAGE_KEY = 'aic.accessToken';
const authDir = path.join(__dirname, '../../.auth');
const authFile = path.join(authDir, 'admin.json');
const baseOrigin = process.env.E2E_BASE_URL ?? 'http://localhost:83';

interface StorageOrigin {
  origin: string;
  localStorage?: Array<{ name: string; value: string }>;
  sessionStorage?: Array<{ name: string; value: string }>;
}

interface StorageState {
  cookies: unknown[];
  origins: StorageOrigin[];
}

function patchSessionToken(state: StorageState, token: string): StorageState {
  let originEntry = state.origins.find((entry) => entry.origin === baseOrigin);

  if (!originEntry) {
    originEntry = { origin: baseOrigin, localStorage: [] };
    state.origins.push(originEntry);
  }

  const sessionStorage = (originEntry.sessionStorage ?? []).filter(
    (entry) => entry.name !== TOKEN_STORAGE_KEY,
  );
  sessionStorage.push({ name: TOKEN_STORAGE_KEY, value: token });
  originEntry.sessionStorage = sessionStorage;

  return state;
}

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? '';

  if (!password) {
    throw new Error(
      'E2E_ADMIN_PASSWORD não definido. Copie e2e/.env.e2e.example para e2e/.env.e2e e preencha a senha.',
    );
  }

  mkdirSync(authDir, { recursive: true });

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);

  await expect(page).not.toHaveURL(/\/login$/);
  await page.getByTestId('app-sidebar').waitFor({ state: 'visible' });

  const token = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    TOKEN_STORAGE_KEY,
  );

  if (!token) {
    throw new Error('Token de sessão não encontrado após login UI.');
  }

  await page.context().storageState({ path: authFile });

  const state = JSON.parse(readFileSync(authFile, 'utf-8')) as StorageState;
  writeFileSync(authFile, JSON.stringify(patchSessionToken(state, token), null, 2));
});
