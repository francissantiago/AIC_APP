import { test, expect } from '../../fixtures/authenticated.fixture';
import {
  AgendaCalendarPage,
  SecretariatDashboardPage,
  VisitorsPage,
} from '../../pages/secretariat.page';

test.describe('Secretariat smoke', () => {
  test('SEC-01 smoke — dashboard e visitantes abrem formulário', async ({ page }) => {
    const dashboard = new SecretariatDashboardPage(page);
    await dashboard.goto();
    await expect(page.getByTestId('secretariat-dashboard-cards')).toBeVisible();

    const visitors = new VisitorsPage(page);
    await visitors.goto();
    await visitors.openCreateDialog();
    await expect(page.getByTestId('visitor-form-full-name')).toBeVisible();
    await page.getByRole('button', { name: /^Cancelar$|^Cancel$|^Cancelar$/i }).click();
    await page.getByTestId('visitor-form').waitFor({ state: 'hidden' });

    const agenda = new AgendaCalendarPage(page);
    await agenda.goto();
    await expect(page.getByTestId('agenda-calendar-view')).toBeVisible();
  });
});
