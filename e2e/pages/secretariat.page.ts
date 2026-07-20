import type { Page } from '@playwright/test';
import path from 'node:path';

import { BasePage } from './base.page';
import { waitForAppShell } from '../helpers/wait.helper';

export class SecretariatDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/secretariat');
    await waitForAppShell(this.page);
    await this.page.getByTestId('secretariat-dashboard').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }
}

export class AgendaCalendarPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/secretariat/agenda');
    await waitForAppShell(this.page);
    await this.page.getByTestId('agenda-calendar').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('agenda-create-btn').click();
    await this.page.getByTestId('agenda-form').waitFor({ state: 'visible' });
  }

  async fillEventForm(options: { title: string; startsAt: string; endsAt: string }): Promise<void> {
    await this.page.getByTestId('agenda-form-title').fill(options.title);
    await this.page.getByTestId('agenda-form-starts').fill(options.startsAt);
    await this.page.getByTestId('agenda-form-ends').fill(options.endsAt);
  }

  async saveEventForm(): Promise<void> {
    const reloadPromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/secretariat/calendar-events') &&
        response.request().method() === 'GET' &&
        response.ok(),
    );
    await this.page.getByTestId('agenda-form-save').click();
    await this.page.getByTestId('agenda-form').waitFor({ state: 'hidden' });
    await reloadPromise;
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async switchToDayView(): Promise<void> {
    await this.page.getByRole('button', { name: /^Dia$|^Day$/i }).click();
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async goToToday(): Promise<void> {
    await this.page.getByRole('button', { name: /^Hoje$|^Today$/i }).click();
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async clickCalendarEvent(title: string, options?: { ensureDayView?: boolean }): Promise<void> {
    if (options?.ensureDayView !== false) {
      await this.switchToDayView();
    }
    const event = this.page.locator('.cal-event').filter({ hasText: title }).first();
    await event.waitFor({ state: 'visible', timeout: 15000 });
    await event.click();
    await this.page.getByTestId('agenda-form').waitFor({ state: 'visible' });
  }

  async deleteCurrentEvent(): Promise<void> {
    await this.page.getByRole('button', { name: /^Excluir$|^Delete$|^Eliminar$/i }).click();
    const confirmDialog = this.page.getByRole('dialog', { name: /Tem certeza|Are you sure|Confirm/i });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
    await this.page.getByTestId('agenda-form').waitFor({ state: 'hidden' });
  }
}

export class VisitorsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/secretariat/visitors');
    await waitForAppShell(this.page);
    await this.page.getByTestId('visitors-list').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('visitor-create-btn').click();
    await this.page.getByTestId('visitor-form').waitFor({ state: 'visible' });
  }

  async fillVisitorForm(options: { fullName: string; visitDate: string }): Promise<void> {
    await this.page.getByTestId('visitor-form-full-name').fill(options.fullName);
    await this.page.getByTestId('visitor-form-visit-date').fill(options.visitDate);
  }

  async saveVisitorForm(): Promise<void> {
    await this.page.getByTestId('visitor-form-save').click();
    await this.page.getByTestId('visitor-form').waitFor({ state: 'hidden' });
  }

  async openEdit(id: string): Promise<void> {
    await this.page.getByTestId(`visitor-edit-${id}`).click();
    await this.page.getByTestId('visitor-form').waitFor({ state: 'visible' });
  }

  async openConvert(id: string): Promise<void> {
    await this.page.getByTestId(`visitor-convert-${id}`).click();
    await this.page.getByTestId('visitor-convert-form').waitFor({ state: 'visible' });
  }

  async submitConvert(): Promise<void> {
    await this.page.getByTestId('visitor-convert-save').click();
    await this.page.getByTestId('visitor-convert-form').waitFor({ state: 'hidden' });
  }

  async deleteVisitor(id: string): Promise<void> {
    await this.page.getByTestId(`visitor-delete-${id}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(id: string) {
    return this.page.getByTestId(`visitor-row-${id}`);
  }
}

export class AttendancePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/secretariat/attendance');
    await waitForAppShell(this.page);
    await this.page.getByTestId('attendance-list').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('attendance-create-btn').click();
    await this.page.getByTestId('attendance-form').waitFor({ state: 'visible' });
  }

  async fillAttendanceForm(options: {
    eventDate: string;
    eventType?: string;
    totalPresent: string;
  }): Promise<void> {
    await this.page.getByTestId('attendance-form-date').fill(options.eventDate);
    if (options.eventType) {
      await this.page.getByTestId('attendance-form-type').selectOption(options.eventType);
    }
    await this.page.getByTestId('attendance-form-total').fill(options.totalPresent);
  }

  async saveAttendanceForm(): Promise<void> {
    await this.page.getByTestId('attendance-form-save').click();
    await this.page.getByTestId('attendance-form').waitFor({ state: 'hidden' });
  }

  async openEdit(id: string): Promise<void> {
    await this.page.getByTestId(`attendance-edit-${id}`).click();
    await this.page.getByTestId('attendance-form').waitFor({ state: 'visible' });
  }

  async deleteAttendance(id: string): Promise<void> {
    await this.page.getByTestId(`attendance-delete-${id}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(id: string) {
    return this.page.getByTestId(`attendance-row-${id}`);
  }
}

export class DocumentsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/secretariat/documents');
    await waitForAppShell(this.page);
    await this.page.getByTestId('documents-list').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openCreateDialog(): Promise<void> {
    await this.page.getByTestId('document-create-btn').click();
    await this.page.getByTestId('document-form').waitFor({ state: 'visible' });
  }

  async fillDocumentForm(options: { title: string; documentDate: string }): Promise<void> {
    await this.page.getByTestId('document-form-title').fill(options.title);
    await this.page.getByTestId('document-form-date').fill(options.documentDate);
  }

  async saveDocumentForm(mode: 'create' | 'update' = 'update'): Promise<void> {
    await this.page.getByTestId('document-form-save').click();
    if (mode === 'create') {
      await this.page.getByTestId('document-form-upload-input').waitFor({ state: 'attached' });
    } else {
      await this.page.getByTestId('document-form').waitFor({ state: 'hidden' });
    }
  }

  async openEdit(id: string): Promise<void> {
    await this.page.getByTestId(`document-edit-${id}`).click();
    await this.page.getByTestId('document-form').waitFor({ state: 'visible' });
  }

  async uploadPdfInForm(): Promise<void> {
    const filePath = path.join(__dirname, '../fixtures/files/e2e-sample.pdf');
    await this.page.getByTestId('document-form-upload-input').setInputFiles(filePath);
    const uploadResponse = this.page.waitForResponse(
      (response) => response.url().includes('/secretariat/documents/') && response.url().includes('/upload') && response.ok(),
    );
    await this.page.getByTestId('document-form-upload-btn').click();
    await uploadResponse;
  }

  async downloadFromForm(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByTestId('document-form-download').click();
    await downloadPromise;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.page.getByTestId(`document-delete-${id}`).click();
    const confirmDialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await confirmDialog.waitFor({ state: 'visible' });
    await confirmDialog.getByTestId('dialog-confirm').click();
    await confirmDialog.waitFor({ state: 'hidden' });
  }

  row(id: string) {
    return this.page.getByTestId(`document-row-${id}`);
  }
}

export class SchedulesBoardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/secretariat/schedules');
    await waitForAppShell(this.page);
    await this.page.getByTestId('schedules-board').waitFor({ state: 'visible' });
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async goCurrentWeek(): Promise<void> {
    await this.page.getByTestId('schedules-week-today').click();
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  async openEditorForEvent(eventId: string): Promise<void> {
    await this.eventCard(eventId).getByRole('button', { name: /Editar escala|Editor/i }).click();
    await this.page.getByTestId('schedule-editor-form').waitFor({ state: 'visible' });
  }

  async fillAssignmentForEvent(options: {
    ministryId: string;
    memberId: string;
    roleLabel: string;
  }): Promise<void> {
    const membersLoad = this.page.waitForResponse(
      (response) =>
        response.url().includes('/schedules/member-options') &&
        response.url().includes(options.ministryId) &&
        response.request().method() === 'GET',
    );
    await this.page.getByTestId('schedule-editor-ministry').selectOption(options.ministryId);
    await membersLoad;
    await this.page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);

    if ((await this.page.getByTestId('schedule-editor-member').count()) === 0) {
      await this.page.getByTestId('schedule-editor-add-row').click();
    }

    await this.page.getByTestId('schedule-editor-member').last().selectOption(options.memberId);
    await this.page.getByTestId('schedule-editor-role-label').last().fill(options.roleLabel);
  }

  async saveEditor(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/schedules/events/') &&
        response.url().includes('/assignments') &&
        response.request().method() === 'PUT',
    );
    await this.page.getByTestId('schedule-editor-save').click();
    await responsePromise;
    await this.page.getByTestId('schedule-editor-form').waitFor({ state: 'hidden' });
  }

  eventCard(eventId: string) {
    return this.page.getByTestId(`schedules-event-${eventId}`);
  }
}
