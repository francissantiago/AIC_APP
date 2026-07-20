import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eCongregationBranchName } from '../../helpers/test-data.helper';
import { CongregationPage, CongregationsListPage } from '../../pages/congregation.page';

test.describe('Congregations module', () => {
  let branchId = '';
  let originalHqName = '';

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    if (branchId) {
      await api.deleteCongregation(branchId).catch(() => undefined);
      branchId = '';
    }
    if (originalHqName) {
      await api.updateCongregationBase({ name: originalHqName }).catch(() => undefined);
      originalHqName = '';
    }
  });

  test('CON-01 — editar dados da congregação sede', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const base = await api.getCongregationBase();
    originalHqName = base.name;
    const updatedName = `${originalHqName} E2E`;

    const congregation = new CongregationPage(page);
    await congregation.gotoActive();
    await congregation.openEditDialog();
    await congregation.fillActiveName(updatedName);
    await congregation.saveActiveForm();

    const refreshed = await api.getCongregationBase();
    expect(refreshed.name).toBe(updatedName);
  });

  test('CON-02 — listar filiais', async ({ page }) => {
    const name = e2eCongregationBranchName('CON02');
    const api = await ApiClient.asAdmin();
    const branch = await api.createCongregationBranch({ name, status: 'active', city: 'E2E City' });
    branchId = branch.id;

    const list = new CongregationsListPage(page);
    await list.goto();
    await list.filterType('branch');
    await list.search(name);
    await expect(list.row(branchId)).toBeVisible();
    await expect(list.row(branchId)).toContainText('E2E City');
  });

  test('CON-03 — criar filial', async ({ page }) => {
    const name = e2eCongregationBranchName('CON03');

    const list = new CongregationsListPage(page);
    await list.goto();
    await list.openCreateBranch();
    await list.fillBranchForm(name);
    await list.saveBranchForm();

    const api = await ApiClient.asAdmin();
    branchId = (await api.findCongregationIdByName(name)) ?? '';
    expect(branchId).toBeTruthy();
    await list.search(name);
    await expect(list.row(branchId)).toBeVisible();
  });

  test('CON-04 — editar filial', async ({ page }) => {
    const name = e2eCongregationBranchName('CON04');
    const api = await ApiClient.asAdmin();
    const branch = await api.createCongregationBranch({ name, status: 'active' });
    branchId = branch.id;
    const edited = `${name} Editado`;

    const list = new CongregationsListPage(page);
    await list.goto();
    await list.search(name);
    await list.openEditBranch(branchId);
    await page.getByTestId('congregation-branch-form-name').fill(edited);
    await list.saveBranchForm();
    await list.search(edited);
    await expect(list.row(branchId)).toContainText(edited);
  });

  test('CON-05 — desativar filial', async ({ page }) => {
    const name = e2eCongregationBranchName('CON05');
    const api = await ApiClient.asAdmin();
    const branch = await api.createCongregationBranch({ name, status: 'active' });
    branchId = branch.id;

    const list = new CongregationsListPage(page);
    await list.goto();
    await list.search(name);
    await list.openEditBranch(branchId);
    await page.getByTestId('congregation-branch-form-status').selectOption('inactive');
    await list.saveBranchForm();

    await list.filterStatus('inactive');
    await list.search(name);
    await expect(list.row(branchId)).toBeVisible();
  });
});
