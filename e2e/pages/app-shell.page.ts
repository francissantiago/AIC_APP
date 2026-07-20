import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class AppShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded(): Promise<void> {
    await waitForAppShell(this.page);
  }

  async navigateViaSidebar(testId: string): Promise<void> {
    await this.page.getByTestId(testId).click();
  }

  async expandSubmenu(toggleTestId: string): Promise<void> {
    const toggle = this.page.getByTestId(toggleTestId);
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await toggle.click();
    }
  }

  async logout(): Promise<void> {
    await this.page.getByTestId('app-logout').click();
    await this.page.waitForURL(/\/login$/);
  }
}
