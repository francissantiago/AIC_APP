import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import {
  e2eAssetName,
  e2eFinanceCategoryName,
  e2eFinanceEntryDescription,
  e2eMemberName,
  monthRangeIsoDate,
  todayIsoDate,
} from '../../helpers/test-data.helper';
import {
  AssetsPage,
  FinanceDashboardPage,
  FinanceEntriesPage,
  FinanceReportsPage,
} from '../../pages/finance.page';

test.describe('Finance module', () => {
  let entryIds: string[] = [];
  let assetId = '';
  let categoryId = '';
  let memberId = '';

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of entryIds.splice(0)) {
      await api.deleteFinancialEntry(id).catch(() => undefined);
    }
    if (assetId) {
      await api.deleteAsset(assetId).catch(() => undefined);
      assetId = '';
    }
    if (categoryId) {
      await api.updateFinancialCategory(categoryId, { active: false }).catch(() => undefined);
      categoryId = '';
    }
    if (memberId) {
      await api.deleteMember(memberId).catch(() => undefined);
      memberId = '';
    }
  });

  test('FIN-01 — dashboard com gráficos e filtro de período', async ({ page }) => {
    const { from, to } = monthRangeIsoDate();
    const dashboard = new FinanceDashboardPage(page);
    await dashboard.goto();
    await dashboard.filterPeriod(from, to);
    await expect(page.getByTestId('finance-dashboard-cards')).toBeVisible();
    await expect(page.getByTestId('finance-monthly-chart')).toBeVisible();
    await expect(page.getByTestId('finance-category-chart')).toBeVisible();
  });

  test('FIN-02 — CRUD lançamento receita e despesa', async ({ page }) => {
    const incomeDesc = e2eFinanceEntryDescription('FIN02-IN');
    const expenseDesc = e2eFinanceEntryDescription('FIN02-EX');
    const entries = new FinanceEntriesPage(page);
    await entries.goto();

    await entries.openCreateDialog();
    await entries.fillEntryForm({
      type: 'income',
      categoryLabel: 'Dízimos',
      description: incomeDesc,
      amount: '150.50',
    });
    await entries.saveEntryForm();

    const api = await ApiClient.asAdmin();
    const incomeId = (await api.findFinancialEntryIdByDescription(incomeDesc)) ?? '';
    expect(incomeId).toBeTruthy();
    entryIds.push(incomeId);
    await expect(entries.row(incomeId)).toContainText(incomeDesc);

    await entries.openEditEntry(incomeId);
    const editedIncome = `${incomeDesc} Editado`;
    await page.getByTestId('finance-entry-form-description').fill(editedIncome);
    await entries.saveEntryForm();
    await expect(entries.row(incomeId)).toContainText(editedIncome);

    await entries.openCreateDialog();
    await entries.fillEntryForm({
      type: 'expense',
      categoryLabel: 'Energia',
      description: expenseDesc,
      amount: '80',
    });
    await entries.saveEntryForm();
    const expenseId = (await api.findFinancialEntryIdByDescription(expenseDesc)) ?? '';
    expect(expenseId).toBeTruthy();
    entryIds.push(expenseId);

    await entries.deleteEntry(expenseId);
    entryIds = entryIds.filter((id) => id !== expenseId);
    await expect(page.getByTestId(`finance-entry-row-${expenseId}`)).toHaveCount(0);

    await entries.deleteEntry(incomeId);
    entryIds = entryIds.filter((id) => id !== incomeId);
  });

  test('FIN-03 — lançamento de dízimo vinculado a membro', async ({ page }) => {
    const memberName = e2eMemberName('FIN03');
    const description = e2eFinanceEntryDescription('FIN03');
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberId = member.id;

    const entries = new FinanceEntriesPage(page);
    await entries.goto();
    await entries.openCreateDialog();
    await entries.fillEntryForm({
      type: 'income',
      categoryLabel: 'Dízimos',
      description,
      amount: '200',
      memberId: member.id,
    });
    await entries.saveEntryForm();

    const entryId = (await api.findFinancialEntryIdByDescription(description)) ?? '';
    expect(entryId).toBeTruthy();
    entryIds.push(entryId);
    await expect(entries.row(entryId)).toContainText(memberName);
  });

  test('FIN-04 — gerenciar categorias', async ({ page }) => {
    const categoryName = e2eFinanceCategoryName('FIN04');
    const entries = new FinanceEntriesPage(page);
    await entries.goto();
    await entries.openCategoriesDialog();
    await entries.createCategory(categoryName, 'expense');

    const api = await ApiClient.asAdmin();
    categoryId = (await api.findFinancialCategoryIdByName(categoryName)) ?? '';
    expect(categoryId).toBeTruthy();

    const row = page.getByTestId(`finance-category-row-${categoryId}`);
    await row.getByRole('button', { name: /Editar|Edit/i }).click();
    const renamed = `${categoryName} Editada`;
    await page.getByTestId('finance-category-name').fill(renamed);
    await page.getByTestId('finance-category-save').click();
    await expect(page.getByTestId('finance-category-manager')).toContainText(renamed);

    categoryId = (await api.findFinancialCategoryIdByName(renamed)) ?? categoryId;
    await row.getByRole('button', { name: /Desativar|Deactivate/i }).click();
    await expect(row).toContainText(/Despesa|Expense/i);
  });

  test('FIN-05 — CRUD patrimônio', async ({ page }) => {
    const name = e2eAssetName('FIN05');
    const assets = new AssetsPage(page);
    await assets.goto();
    await assets.openCreateDialog();
    await assets.fillAssetForm(name, '2500');
    await assets.saveAssetForm();

    const api = await ApiClient.asAdmin();
    assetId = (await api.findAssetIdByName(name)) ?? '';
    expect(assetId).toBeTruthy();
    await expect(assets.row(assetId)).toContainText(name);

    await assets.openEditAsset(assetId);
    const edited = `${name} Editado`;
    await page.getByTestId('asset-form-name').fill(edited);
    await assets.saveAssetForm();
    await expect(assets.row(assetId)).toContainText(edited);

    await assets.deleteAsset(assetId);
    const deletedId = assetId;
    assetId = '';
    await expect(page.getByTestId(`asset-row-${deletedId}`)).toHaveCount(0);
  });

  test('FIN-06 — relatórios filtrar e exportar', async ({ page }) => {
    const description = e2eFinanceEntryDescription('FIN06');
    const api = await ApiClient.asAdmin();
    const category = await api.findIncomeCategoryByName('Dízimos');
    expect(category).toBeTruthy();
    const entry = await api.createFinancialEntry({
      entryDate: todayIsoDate(),
      type: 'income',
      categoryId: category!.id,
      description,
      amount: 50,
    });
    entryIds.push(entry.id);

    const reports = new FinanceReportsPage(page);
    await reports.goto();
    await reports.selectCashTab();
    const { from, to } = monthRangeIsoDate();
    await reports.applyCashPeriod(from, to);
    await expect(page.getByTestId('finance-reports-cash-table')).toContainText(description);
    await reports.exportCashCsv();

    await reports.selectAssetsTab();
    await expect(page.getByText(/Quantidade|Quantity/i)).toBeVisible();
  });
});
