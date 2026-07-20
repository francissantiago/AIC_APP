import type { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  get mainContent() {
    return this.page.getByTestId('app-main');
  }

  get sidebar() {
    return this.page.getByTestId('app-sidebar');
  }
}
