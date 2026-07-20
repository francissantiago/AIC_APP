import type { Page } from '@playwright/test';

import { BasePage } from './base.page';

import { waitForAppShell } from '../helpers/wait.helper';



export class FamiliesPage extends BasePage {

  constructor(page: Page) {

    super(page);

  }



  async goto(): Promise<void> {

    await this.page.goto('/families');

    await waitForAppShell(this.page);

    await this.page.getByTestId('family-table').waitFor({ state: 'visible' });

  }



  async gotoBirthdaysReport(): Promise<void> {

    await this.page.goto('/families/birthdays');

    await waitForAppShell(this.page);

    await this.page.getByTestId('family-birthdays-report').waitFor({ state: 'visible' });

  }



  async openCreateDialog(): Promise<void> {

    await this.page.getByTestId('family-create-btn').click();

    await this.page.getByTestId('family-form').waitFor({ state: 'visible' });

  }



  async fillCreateForm(name: string): Promise<void> {

    await this.page.getByTestId('family-form-name').fill(name);

  }



  async saveForm(): Promise<void> {

    await this.page.getByTestId('family-form-save').click();

    await this.page.getByTestId('family-form').waitFor({ state: 'hidden' });

  }



  async search(query: string): Promise<void> {

    await this.page.getByTestId('family-search').fill(query);

  }



  async openEdit(familyId: string): Promise<void> {

    await this.page.getByTestId(`family-edit-${familyId}`).click();

    await this.page.getByTestId('family-form').waitFor({ state: 'visible' });

  }



  async openMembers(familyId: string): Promise<void> {

    await this.page.getByTestId(`family-members-${familyId}`).click();

    await this.page.getByTestId('family-members-panel').waitFor({ state: 'visible' });

  }



  async addMember(memberId: string): Promise<void> {

    await this.page.getByTestId('family-add-member-select').selectOption(memberId);

    await this.page.getByTestId('family-add-member-btn').click();

    await this.page.getByTestId(`family-member-row-${memberId}`).waitFor({ state: 'visible' });

  }



  async removeMember(memberId: string): Promise<void> {

    await this.page.getByTestId(`family-member-remove-${memberId}`).click();

    await this.page.getByTestId('family-unlink-confirm').click();

    await this.page.getByTestId(`family-member-row-${memberId}`).waitFor({ state: 'hidden' });

  }



  async deleteFamily(familyId: string): Promise<void> {

    await this.page.getByTestId(`family-delete-${familyId}`).click();

    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });

  }



  async filterBirthdaysByMonth(month: number): Promise<void> {

    await this.page.locator('[formcontrolname="month"]').selectOption(String(month));

    await this.page.getByTestId('family-birthdays-filter-btn').click();

  }



  row(familyId: string) {

    return this.page.getByTestId(`family-row-${familyId}`);

  }

}


