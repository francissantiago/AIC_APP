import type { Page } from '@playwright/test';

import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class AnnouncementsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/announcements');
    await waitForAppShell(this.page);
    await this.page.getByTestId('announcements-page').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async expectBoardReady(): Promise<void> {
    await this.page.getByTestId('announcements-board').waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('announcement-create-btn').click();
    await this.page.getByTestId('announcement-form').waitFor({ state: 'visible' });
  }

  async fillForm(title: string, body: string): Promise<void> {
    await this.page.getByTestId('announcement-form-title').fill(title);
    await this.page.getByTestId('announcement-form-body').fill(body);
  }

  async saveForm(): Promise<void> {
    await this.page.getByTestId('announcement-form-save').click();
    await this.page.getByTestId('announcement-form').waitFor({ state: 'hidden' });
  }

  board() {
    return this.page.getByTestId('announcements-board');
  }
}
