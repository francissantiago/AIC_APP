import type { Page } from '@playwright/test';

import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class SocialProjectsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/social-projects');
    await waitForAppShell(this.page);
    await this.page
      .getByTestId('social-project-create-btn')
      .or(this.page.getByTestId('social-project-table'))
      .or(this.page.getByText(/Nenhum|No projects|Sin proyectos/i))
      .first()
      .waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('social-project-create-btn').click();
    await this.page.getByTestId('social-project-form').waitFor({ state: 'visible' });
  }

  async fillCreateForm(name: string): Promise<void> {
    await this.page.getByTestId('social-project-form').locator('[formcontrolname="name"]').fill(name);
  }

  async saveForm(): Promise<void> {
    const form = this.page.getByTestId('social-project-form');
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/social-projects') &&
        response.request().method() === 'POST' &&
        response.ok(),
    );
    await form.getByRole('button', { name: /Salvar|Save|Guardar/i }).click();
    await saveResponse;
    const dialog = this.page.locator('dialog[open][data-testid="app-dialog"]').filter({ has: form });
    await dialog.getByRole('button', { name: /Fechar|Close|Cerrar/i }).click();
    await form.waitFor({ state: 'hidden' });
  }

  async search(query: string): Promise<void> {
    await this.page.locator('[formcontrolname="q"]').fill(query);
  }

  row(projectId: string) {
    return this.page.getByTestId(`social-project-row-${projectId}`);
  }
}
