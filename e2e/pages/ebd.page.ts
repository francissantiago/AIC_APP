import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class EbdPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/ebd');
    await waitForAppShell(this.page);
    await this.page.getByTestId('class-create-btn').waitFor({ state: 'visible' });
  }

  async gotoReports(): Promise<void> {
    await this.page.goto('/ebd/reports');
    await waitForAppShell(this.page);
    await this.page.getByTestId('class-frequency-report').waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('class-create-btn').click();
    await this.page.getByTestId('class-form').waitFor({ state: 'visible' });
  }

  async fillCreateForm(name: string, status = 'active'): Promise<void> {
    await this.page.getByTestId('class-form-name').fill(name);
    await this.page.getByTestId('class-form-status').selectOption(status);
  }

  async saveForm(): Promise<void> {
    await this.page.getByTestId('class-form-save').click();
    await this.page.getByTestId('class-form').waitFor({ state: 'hidden' });
  }

  async search(query: string): Promise<void> {
    await this.page.getByTestId('class-search').fill(query);
  }

  async openEdit(classId: string): Promise<void> {
    await this.page.getByTestId(`class-edit-${classId}`).click();
    await this.page.getByTestId('class-form').waitFor({ state: 'visible' });
  }

  async openEnrollments(classId: string): Promise<void> {
    await this.page.getByTestId(`class-enrollments-${classId}`).click();
    await this.page.getByTestId('class-enrollments-panel').waitFor({ state: 'visible' });
  }

  async enrollMember(memberId: string): Promise<void> {
    await this.page.getByTestId('class-enroll-member-select').selectOption(memberId);
    await this.page.getByTestId('class-enroll-member-btn').click();
    await this.page.getByTestId(`class-enrollment-row-${memberId}`).waitFor({ state: 'visible' });
  }

  async closeEnrollmentsPanelIfOpen(): Promise<void> {
    const dialog = this.page.locator('dialog[open][data-testid="app-dialog"]').filter({
      has: this.page.getByTestId('class-enrollments-panel'),
    });
    if (await dialog.isVisible()) {
      await dialog.locator('header button').click();
      await this.page.getByTestId('class-enrollments-panel').waitFor({ state: 'hidden' });
    }
  }

  async openAttendance(classId: string): Promise<void> {
    await this.closeEnrollmentsPanelIfOpen();
    await this.page.getByTestId(`class-attendance-${classId}`).click();
    await this.page.getByTestId('class-attendance-panel').waitFor({ state: 'visible' });
  }

  async setSessionDate(date: string): Promise<void> {
    await this.page.getByTestId('class-attendance-date').fill(date);
    await this.page.getByTestId('class-attendance-reload').click();
  }

  async markMemberPresent(memberId: string): Promise<void> {
    await this.page.locator(`input[name="present-${memberId}"]`).first().check();
  }

  async saveAttendance(): Promise<void> {
    await this.page.getByTestId('class-attendance-save').click();
  }

  async deleteClass(classId: string): Promise<void> {
    await this.page.getByTestId(`class-delete-${classId}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  async filterReport(classId: string, from: string, to: string): Promise<void> {
    await this.page.getByTestId('class-report-class-select').selectOption(classId);
    await this.page.locator('[formcontrolname="from"]').fill(from);
    await this.page.locator('[formcontrolname="to"]').fill(to);
    await this.page.getByTestId('class-report-filter-btn').click();
  }

  row(classId: string) {
    return this.page.getByTestId(`class-row-${classId}`);
  }
}
