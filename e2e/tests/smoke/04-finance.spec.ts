import { test, expect } from '../../fixtures/authenticated.fixture';
import { FinanceDashboardPage, FinanceEntriesPage } from '../../pages/finance.page';

test.describe('Finance smoke', () => {
  test('FIN-01 smoke — dashboard carrega e entries abre dialog', async ({ page }) => {
    const { from, to } = await import('../../helpers/test-data.helper').then((m) => m.monthRangeIsoDate());
    const dashboard = new FinanceDashboardPage(page);
    await dashboard.goto();
    await dashboard.filterPeriod(from, to);
    await expect(page.getByTestId('finance-dashboard-cards')).toBeVisible();

    const entries = new FinanceEntriesPage(page);
    await entries.goto();
    await entries.openCreateDialog();
    await expect(page.getByTestId('finance-entry-form-description')).toBeVisible();
    await entries.cancelEntryForm();
  });
});
