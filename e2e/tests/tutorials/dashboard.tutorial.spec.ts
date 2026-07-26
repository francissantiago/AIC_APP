import { test, expect } from '../../fixtures/tutorial.fixture';
import { DashboardPage } from '../../pages/dashboard.page';

test.describe.configure({ mode: 'serial' });

test('dashboard — visão geral da igreja', async ({ page, tutorialStep }) => {
  const dashboard = new DashboardPage(page);

  await tutorialStep('Abrir painel principal', async () => {
    await dashboard.goto();
    await expect(page.getByTestId('home-dashboard')).toBeVisible();
  });

  await tutorialStep('Explorar indicadores e alertas', async () => {
    await expect(dashboard.mainContent).toBeVisible();
  });
});
