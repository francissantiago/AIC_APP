import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './base.page';import { waitForAppShell } from '../helpers/wait.helper';

export class ProfilePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await waitForAppShell(this.page);
    await this.page.getByTestId('profile-page').waitFor({ state: 'visible' });
  }

  async updateFullName(fullName: string): Promise<void> {
    await this.page.getByTestId('profile-full-name').fill(fullName);
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/auth/me') &&
        response.request().method() === 'PATCH' &&
        response.ok(),
    );
    await this.page.getByTestId('profile-save-btn').click();
    await saveResponse;
    await expect(this.page.getByRole('status')).toBeVisible();
    await expect(this.page.getByTestId('profile-full-name')).toHaveValue(fullName);
  }

  fullNameInput() {
    return this.page.getByTestId('profile-full-name');
  }
}
