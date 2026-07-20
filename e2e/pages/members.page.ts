import type { Page } from '@playwright/test';

import { BasePage } from './base.page';

import { waitForAppShell } from '../helpers/wait.helper';



export class MembersPage extends BasePage {

  constructor(page: Page) {

    super(page);

  }



  async goto(): Promise<void> {
    await this.page.goto('/members');
    await waitForAppShell(this.page);
    await this.page.getByTestId('member-create-btn').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async expectListReady(): Promise<void> {
    const table = this.page.getByTestId('member-table');
    const empty = this.page.getByText(/Nenhum membro|No members/i);
    await table.or(empty).first().waitFor({ state: 'visible' });
  }



  async openCreateDialog(): Promise<void> {

    await this.page.getByTestId('member-create-btn').click();

    await this.page.getByTestId('member-form').waitFor({ state: 'visible' });

  }



  async fillCreateForm(options: {

    fullName: string;

    birthDate?: string;

    email?: string;

    status?: string;

  }): Promise<void> {

    await this.page.getByTestId('member-form-full-name').fill(options.fullName);

    if (options.email) {

      await this.page.locator('[formcontrolname="email"]').fill(options.email);

    }

    if (options.birthDate) {

      await this.page.getByTestId('member-form-birth-date').fill(options.birthDate);

    }

    if (options.status) {

      await this.page.getByTestId('member-form-status').selectOption(options.status);

    }

  }



  async saveForm(): Promise<void> {

    await this.page.getByTestId('member-form-save').click();

    await this.page.getByTestId('member-form').waitFor({ state: 'hidden' });

  }



  async cancelForm(): Promise<void> {

    await this.page.getByTestId('member-form-cancel').click();

    await this.page.getByTestId('member-form').waitFor({ state: 'hidden' });

  }



  async search(query: string): Promise<void> {

    await this.page.getByTestId('member-search').fill(query);

  }



  async filterStatus(status: string): Promise<void> {

    await this.page.getByTestId('member-filter-status').selectOption(status);

  }



  async openEdit(memberId: string): Promise<void> {

    await this.page.getByTestId(`member-edit-${memberId}`).click();

    await this.page.getByTestId('member-form').waitFor({ state: 'visible' });

  }



  async setStatus(status: 'active' | 'inactive' | 'transferred' | 'deceased'): Promise<void> {

    await this.page.getByTestId('member-form-status').selectOption(status);

  }



  async deleteMember(memberId: string): Promise<void> {
    await this.page.getByTestId(`member-delete-${memberId}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }



  async goToTransfersTab(): Promise<void> {

    await this.page.getByTestId('member-tab-transfers').click();

  }



  async startTransferWizard(): Promise<void> {

    await this.page.getByTestId('member-transfer-start').click();

    await this.page.getByTestId('member-transfer-wizard').waitFor({ state: 'visible' });

  }



  async fillTransferDestination(church: string, city: string): Promise<void> {

    await this.page.getByTestId('transfer-destination-church').fill(church);

    await this.page.getByTestId('transfer-destination-city').fill(city);

  }



  async transferGoToPreview(): Promise<void> {

    await this.page.getByTestId('transfer-next').click();

    await this.page.getByTestId('transfer-letter-preview').waitFor({ state: 'visible' });

  }



  async nextPage(): Promise<void> {

    await this.page.getByTestId('member-page-next').click();

  }



  async previousPage(): Promise<void> {

    await this.page.getByTestId('member-page-prev').click();

  }



  row(memberId: string) {

    return this.page.getByTestId(`member-row-${memberId}`);

  }

}


