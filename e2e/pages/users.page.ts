import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class UsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/users');
    await waitForAppShell(this.page);
    await this.page.getByTestId('user-table').waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('user-create-btn').click();
    await this.page.getByTestId('user-form').waitFor({ state: 'visible' });
  }

  async fillCreateForm(options: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    roleCode: string;
  }): Promise<void> {
    await this.page.getByTestId('user-form-username').fill(options.username);
    await this.page.getByTestId('user-form-email').fill(options.email);
    await this.page.getByTestId('user-form-full-name').fill(options.fullName);
    await this.page.getByTestId('user-form-password').fill(options.password);
    await this.page.locator('[formcontrolname="confirmPassword"]').fill(options.password);
    await this.page.getByTestId('user-form-status').selectOption('active');
    await this.page.getByTestId(`user-form-role-${options.roleCode}`).check();
  }

  async saveForm(): Promise<void> {
    await this.page.getByTestId('user-form-save').click();
    await this.page.getByTestId('user-form').waitFor({ state: 'hidden' });
  }

  async search(query: string): Promise<void> {
    await this.page.getByTestId('user-search').fill(query);
  }

  async openEdit(username: string): Promise<void> {
    await this.page.getByTestId(`user-edit-${username}`).click();
    await this.page.getByTestId('user-form').waitFor({ state: 'visible' });
  }

  async setStatus(status: 'active' | 'inactive' | 'suspended' | 'pending'): Promise<void> {
    await this.page.getByTestId('user-form-status').selectOption(status);
  }

  async deleteUser(username: string): Promise<void> {
    await this.page.getByTestId(`user-delete-${username}`).click();
    await this.page.getByTestId('app-dialog').waitFor({ state: 'visible' });
    await this.page.getByTestId('dialog-confirm').click();
    await this.page.getByTestId('app-dialog').waitFor({ state: 'hidden' });
  }

  row(username: string) {
    return this.page.getByTestId(`user-row-${username}`);
  }
}
