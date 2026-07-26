import type { Page } from '@playwright/test';

import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class MissionsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoAssignments(): Promise<void> {
    await this.page.goto('/missions');
    await waitForAppShell(this.page);
    await this.page.getByTestId('mission-assignment-create-btn').or(this.page.getByRole('heading').first()).first().waitFor({ state: 'visible' });
  }

  async gotoFields(): Promise<void> {
    await this.page.goto('/missions/fields');
    await waitForAppShell(this.page);
  }

  async openCreateAssignmentDialog(): Promise<void> {
    await this.page.getByTestId('mission-assignment-create-btn').click();
    await this.page.getByTestId('mission-assignment-form').waitFor({ state: 'visible' });
  }

  async fillAssignmentForm(options: {
    memberId: string;
    missionFieldId: string;
    startDate: string;
  }): Promise<void> {
    await this.page.locator('[formcontrolname="memberId"]').selectOption(options.memberId);
    await this.page.locator('[formcontrolname="missionFieldId"]').selectOption(options.missionFieldId);
    await this.page.locator('[formcontrolname="startDate"]').fill(options.startDate);
  }

  async saveAssignmentForm(): Promise<void> {
    await this.page.getByTestId('mission-assignment-form').getByRole('button', { name: /Salvar|Save|Guardar/i }).click();
    await this.page.getByTestId('mission-assignment-form').waitFor({ state: 'hidden' });
  }
}
