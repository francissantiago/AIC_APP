import { test, expect } from '@playwright/test';

import { LoginPage } from '../../pages/login.page';
import { AppShellPage } from '../../pages/app-shell.page';
import { tutorialIntroPause, tutorialPause, prepareTutorialPage } from '../../fixtures/tutorial.fixture';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.configure({ mode: 'serial' });

test('auth-login — entrar na plataforma', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? '';
  test.skip(!password, 'E2E_ADMIN_PASSWORD não configurado');

  await prepareTutorialPage(page);
  await tutorialIntroPause(page);

  await test.step('Abrir tela de login', async () => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('language-switcher')).toBeVisible();
    await tutorialPause(page);
  });

  await test.step('Autenticar com credenciais admin', async () => {
    const loginPage = new LoginPage(page);
    await loginPage.login(email, password);
    await expect(page).not.toHaveURL(/\/login$/);
    await tutorialPause(page);
  });

  await test.step('Confirmar shell autenticado', async () => {
    const shell = new AppShellPage(page);
    await shell.expectLoaded();
    await expect(page.getByTestId('app-sidebar-nav')).toBeVisible();
    await expect(page.getByTestId('notifications-bell')).toBeVisible();
    await tutorialPause(page);
  });
});
