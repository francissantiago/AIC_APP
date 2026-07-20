import type { Page } from '@playwright/test';

import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class FinanceDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/finance');
    await waitForAppShell(this.page);
    await this.page.getByTestId('finance-dashboard').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async filterPeriod(from: string, to: string): Promise<void> {
    await this.page.getByTestId('finance-dashboard-from').fill(from);
    await this.page.getByTestId('finance-dashboard-to').fill(to);
    await this.page.getByTestId('finance-dashboard-filter').click();
    await this.page.getByTestId('finance-dashboard-cards').waitFor({ state: 'visible' });
  }
}

export class FinanceEntriesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/finance/entries');
    await waitForAppShell(this.page);
    await this.page.getByTestId('finance-entries').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('finance-entry-create-btn').click();
    await this.page.getByTestId('finance-entry-form').waitFor({ state: 'visible' });
  }

  async openCategoriesDialog(): Promise<void> {
    await this.page.getByTestId('finance-categories-btn').click();
    await this.page.getByTestId('finance-category-manager').waitFor({ state: 'visible' });
  }

  async fillEntryForm(options: {
    type: 'income' | 'expense';
    categoryLabel: string;
    description: string;
    amount: string;
    memberId?: string;
  }): Promise<void> {
    await this.page.getByTestId('finance-entry-form-type').selectOption(options.type);
    const categorySelect = this.page.getByTestId('finance-entry-form-category');
    await categorySelect.selectOption({ label: options.categoryLabel });
    await this.page.getByTestId('finance-entry-form-description').fill(options.description);
    await this.page.getByTestId('finance-entry-form-amount').fill(options.amount);
    if (options.memberId) {
      await this.page.getByTestId('finance-entry-form-member').waitFor({ state: 'visible' });
      await this.page.getByTestId('finance-entry-form-member').selectOption(options.memberId);
    }
  }

  async saveEntryForm(): Promise<void> {
    await this.page.getByTestId('finance-entry-form-save').click();
    await this.page.locator('dialog[open]').filter({ has: this.page.getByTestId('finance-entry-form') }).waitFor({ state: 'hidden' });
  }

  async cancelEntryForm(): Promise<void> {
    await this.page.getByTestId('finance-entry-form-cancel').click();
    await this.page.locator('dialog[open]').filter({ has: this.page.getByTestId('finance-entry-form') }).waitFor({ state: 'hidden' });
  }

  async createCategory(name: string, type: 'income' | 'expense' = 'expense'): Promise<void> {
    await this.page.getByTestId('finance-category-name').fill(name);
    await this.page.getByTestId('finance-category-type').selectOption(type);
    await this.page.getByTestId('finance-category-save').click();
    await this.page.getByTestId('finance-category-manager').getByText(name).waitFor({ state: 'visible' });
  }

  async openEditEntry(id: string): Promise<void> {
    await this.page.getByTestId(`finance-entry-edit-${id}`).click();
    await this.page.getByTestId('finance-entry-form').waitFor({ state: 'visible' });
  }

  async deleteEntry(id: string): Promise<void> {
    await this.page.getByTestId(`finance-entry-delete-${id}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(id: string) {
    return this.page.getByTestId(`finance-entry-row-${id}`);
  }
}

export class AssetsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/finance/assets');
    await waitForAppShell(this.page);
    await this.page.getByTestId('assets-list').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('asset-create-btn').click();
    await this.page.getByTestId('asset-form').waitFor({ state: 'visible' });
  }

  async fillAssetForm(name: string, acquisitionValue = '1000'): Promise<void> {
    await this.page.getByTestId('asset-form-name').fill(name);
    await this.page.getByTestId('asset-form-acquisition-value').fill(acquisitionValue);
  }

  async saveAssetForm(): Promise<void> {
    await this.page.getByTestId('asset-form-save').click();
    await this.page.getByTestId('asset-form').waitFor({ state: 'hidden' });
  }

  async openEditAsset(id: string): Promise<void> {
    await this.page.getByTestId(`asset-edit-${id}`).click();
    await this.page.getByTestId('asset-form').waitFor({ state: 'visible' });
  }

  async deleteAsset(id: string): Promise<void> {
    await this.page.getByTestId(`asset-delete-${id}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(id: string) {
    return this.page.getByTestId(`asset-row-${id}`);
  }
}

export class FinanceReportsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/finance/reports');
    await waitForAppShell(this.page);
    await this.page.getByTestId('finance-reports').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async selectCashTab(): Promise<void> {
    await this.page.getByTestId('finance-reports-tab-cash').click();
  }

  async applyCashPeriod(from: string, to: string): Promise<void> {
    await this.page.locator('[formcontrolname="from"]').first().fill(from);
    await this.page.locator('[formcontrolname="to"]').first().fill(to);
    await this.page.getByRole('button', { name: /^Filtrar$|^Filter$/i }).first().click();
    await this.page.getByTestId('finance-reports-cash-table').waitFor({ state: 'visible' });
  }

  async selectAssetsTab(): Promise<void> {
    await this.page.getByTestId('finance-reports-tab-assets').click();
  }

  async exportCashCsv(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/finance/reports/cash-flow.csv') && response.ok(),
    );
    await this.page.getByTestId('finance-reports-export-csv').click();
    await responsePromise;
  }
}
