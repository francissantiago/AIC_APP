import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class RolesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/roles');
    await waitForAppShell(this.page);
    await this.page.getByTestId('role-table').waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('role-create-btn').click();
    await this.page.getByTestId('role-form').waitFor({ state: 'visible' });
  }

  async fillCreateForm(options: {
    code: string;
    name: string;
    permissions?: Array<{ resource: string; action: 'read' | 'write' }>;
  }): Promise<void> {
    await this.page.getByTestId('role-form-code').fill(options.code);
    await this.page.getByTestId('role-form-name').fill(options.name);

    for (const permission of options.permissions ?? []) {
      const testId = `role-permission-${permission.resource}-${permission.action}`;
      await this.page.getByTestId(testId).check();
    }
  }

  async saveForm(): Promise<void> {
    await this.page.getByTestId('role-form-save').click();
    await this.page.getByTestId('role-form').waitFor({ state: 'hidden' });
  }

  async openEdit(roleCode: string): Promise<void> {
    await this.page.getByTestId(`role-edit-${roleCode}`).click();
    await this.page.getByTestId('role-form').waitFor({ state: 'visible' });
  }

  row(roleCode: string) {
    return this.page.getByTestId(`role-row-${roleCode}`);
  }

  deleteButton(roleCode: string) {
    return this.page.getByTestId(`role-delete-${roleCode}`);
  }
}
