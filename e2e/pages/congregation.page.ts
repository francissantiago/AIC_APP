import type { Page } from '@playwright/test';

import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class CongregationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoActive(): Promise<void> {
    await this.page.goto('/congregation');
    await waitForAppShell(this.page);
    await this.page.getByTestId('congregation-active').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openEditDialog(): Promise<void> {
    const form = this.page.getByTestId('congregation-form');
    if (!(await form.isVisible())) {
      await this.page.getByTestId('congregation-edit-btn').click();
    }
    await form.waitFor({ state: 'visible' });
  }

  async fillActiveName(name: string): Promise<void> {
    await this.page.getByTestId('congregation-form-name').fill(name);
  }

  async saveActiveForm(): Promise<void> {
    await this.page.getByTestId('congregation-form-save').click();
    await this.page
      .getByText(/Congregação salva com sucesso|Salvo com sucesso|Saved successfully/i)
      .waitFor({ state: 'visible' });
  }
}

export class CongregationsListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/congregations');
    await waitForAppShell(this.page);
    await this.page.getByTestId('congregations-list').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async search(query: string): Promise<void> {
    await this.page.getByTestId('congregation-search').fill(query);
  }

  async filterType(type: string): Promise<void> {
    await this.page.getByTestId('congregation-filter-type').selectOption(type);
  }

  async filterStatus(status: string): Promise<void> {
    await this.page.getByTestId('congregation-filter-status').selectOption(status);
  }

  async openCreateBranch(): Promise<void> {
    await this.page.getByTestId('congregation-create-btn').click();
    await this.page.getByTestId('congregation-branch-form').waitFor({ state: 'visible' });
  }

  async fillBranchForm(name: string, status = 'active'): Promise<void> {
    await this.page.getByTestId('congregation-branch-form-name').fill(name);
    await this.page.getByTestId('congregation-branch-form-status').selectOption(status);
  }

  async saveBranchForm(): Promise<void> {
    await this.page.getByTestId('congregation-branch-form-save').click();
    await this.page.getByTestId('congregation-branch-form').waitFor({ state: 'hidden' });
  }

  async openEditBranch(id: string): Promise<void> {
    await this.page.getByTestId(`congregation-edit-${id}`).click();
    await this.page.getByTestId('congregation-branch-form').waitFor({ state: 'visible' });
  }

  async deleteBranch(id: string): Promise<void> {
    await this.page.getByTestId(`congregation-delete-${id}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(id: string) {
    return this.page.getByTestId(`congregation-row-${id}`);
  }
}
