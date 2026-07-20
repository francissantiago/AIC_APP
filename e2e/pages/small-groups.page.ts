import type { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class SmallGroupsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/small-groups');
    await waitForAppShell(this.page);
    await this.page.getByTestId('small-group-create-btn').waitFor({ state: 'visible' });
  }

  async gotoReports(): Promise<void> {
    await this.page.goto('/small-groups/reports');
    await waitForAppShell(this.page);
    await this.page.getByTestId('small-group-frequency-report').waitFor({ state: 'visible' });
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('small-group-create-btn').click();
    await this.page.getByTestId('small-group-form').waitFor({ state: 'visible' });
  }

  async fillCreateForm(name: string, status = 'active'): Promise<void> {
    await this.page.getByTestId('small-group-form-name').fill(name);
    await this.page.getByTestId('small-group-form-status').selectOption(status);
  }

  async saveForm(): Promise<void> {
    await this.page.getByTestId('small-group-form-save').click();
    await this.page.getByTestId('small-group-form').waitFor({ state: 'hidden' });
  }

  async search(query: string): Promise<void> {
    await this.page.getByTestId('small-group-search').fill(query);
  }

  async openEdit(groupId: string): Promise<void> {
    await this.page.getByTestId(`small-group-edit-${groupId}`).click();
    await this.page.getByTestId('small-group-form').waitFor({ state: 'visible' });
  }

  async openMembers(groupId: string): Promise<void> {
    await this.page.getByTestId(`small-group-members-${groupId}`).click();
    await this.page.getByTestId('small-group-members-panel').waitFor({ state: 'visible' });
  }

  async closeMembersPanelIfOpen(): Promise<void> {
    const dialog = this.page.locator('dialog[open][data-testid="app-dialog"]').filter({
      has: this.page.getByTestId('small-group-members-panel'),
    });
    if (await dialog.isVisible()) {
      await dialog.locator('header button').click();
      await this.page.getByTestId('small-group-members-panel').waitFor({ state: 'hidden' });
    }
  }

  async addMember(memberId: string): Promise<void> {
    await this.page.getByTestId('small-group-add-member-select').selectOption(memberId);
    await this.page.getByTestId('small-group-add-member-btn').click();
    await this.page.getByTestId(`small-group-member-row-${memberId}`).waitFor({ state: 'visible' });
  }

  async removeMember(memberId: string): Promise<void> {
    await this.page.getByTestId(`small-group-member-remove-${memberId}`).click();
    await this.page.getByTestId('small-group-unlink-confirm').click();
    await this.page.getByTestId(`small-group-member-row-${memberId}`).waitFor({ state: 'hidden' });
  }

  async openMeetings(groupId: string): Promise<void> {
    await this.closeMembersPanelIfOpen();
    await this.page.getByTestId(`small-group-meetings-${groupId}`).click();
    await this.page.getByTestId('small-group-meetings-panel').waitFor({ state: 'visible' });
  }

  async createMeeting(date: string, theme: string): Promise<void> {
    await this.page.getByTestId('small-group-meeting-date').fill(date);
    await this.page.getByTestId('small-group-meeting-theme').fill(theme);
    await this.page.getByTestId('small-group-meeting-save').click();
  }

  async openMeetingAttendance(meetingId: string): Promise<void> {
    await this.page.getByTestId(`small-group-meeting-attendance-${meetingId}`).click();
    await this.page.getByTestId('small-group-attendance-panel').waitFor({ state: 'visible' });
  }

  async markMemberPresent(memberId: string): Promise<void> {
    await this.page.locator(`input[name="sg-present-${memberId}"]`).first().check();
  }

  async saveAttendance(): Promise<void> {
    await this.page.getByTestId('small-group-attendance-save').click();
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.page.getByTestId(`small-group-delete-${groupId}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  async filterReport(groupId: string, from: string, to: string): Promise<void> {
    await this.page.getByTestId('small-group-report-group-select').selectOption(groupId);
    await this.page.locator('[formcontrolname="from"]').fill(from);
    await this.page.locator('[formcontrolname="to"]').fill(to);
    await this.page.getByTestId('small-group-report-filter-btn').click();
  }

  row(groupId: string) {
    return this.page.getByTestId(`small-group-row-${groupId}`);
  }
}
