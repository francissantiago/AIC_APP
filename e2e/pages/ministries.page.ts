import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class MinistriesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/ministries');
    await waitForAppShell(this.page);
    await this.page.getByTestId('ministry-create-btn').waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('ministry-create-btn').click();
    await this.page.getByTestId('ministry-form').waitFor({ state: 'visible' });
  }

  async fillCreateForm(name: string, status = 'active'): Promise<void> {
    await this.page.getByTestId('ministry-form-name').fill(name);
    await this.page.getByTestId('ministry-form-status').selectOption(status);
  }

  async saveForm(): Promise<void> {
    await this.page.getByTestId('ministry-form-save').click();
    await this.page.getByTestId('ministry-form').waitFor({ state: 'hidden' });
  }

  async cancelForm(): Promise<void> {
    await this.page.getByTestId('ministry-form-cancel').click();
    await this.page.getByTestId('ministry-form').waitFor({ state: 'hidden' });
  }

  async search(query: string): Promise<void> {
    await this.page.getByTestId('ministry-search').fill(query);
  }

  async filterStatus(status: string): Promise<void> {
    await this.page.getByTestId('ministry-filter-status').selectOption(status);
  }

  async openEdit(ministryId: string): Promise<void> {
    await this.page.getByTestId(`ministry-edit-${ministryId}`).click();
    await this.page.getByTestId('ministry-form').waitFor({ state: 'visible' });
  }

  async openMembers(ministryId: string): Promise<void> {
    await this.page.getByTestId(`ministry-members-${ministryId}`).click();
    await this.page.getByTestId('ministry-members-panel').waitFor({ state: 'visible' });
  }

  async addMember(memberId: string): Promise<void> {
    await this.page.getByTestId('ministry-add-member-select').selectOption(memberId);
    await this.page.getByTestId('ministry-add-member-btn').click();
    await this.page.getByTestId(`ministry-member-row-${memberId}`).waitFor({ state: 'visible' });
  }

  async removeMember(memberId: string): Promise<void> {
    await this.page.getByTestId(`ministry-member-remove-${memberId}`).click();
    await this.page.getByTestId('ministry-unlink-confirm').click();
    await this.page.getByTestId(`ministry-member-row-${memberId}`).waitFor({ state: 'hidden' });
  }

  async deleteMinistry(ministryId: string): Promise<void> {
    await this.page.getByTestId(`ministry-delete-${ministryId}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(ministryId: string) {
    return this.page.getByTestId(`ministry-row-${ministryId}`);
  }
}
