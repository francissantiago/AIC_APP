import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import {
  currentYearCalendarRange,
  e2eCalendarEventTitle,
  e2eDocumentTitle,
  e2eMemberName,
  e2eMinistryName,
  e2eVisitorName,
  eventCrossMidnightInCurrentWeek,
  eventEarlyMorningInCurrentWeek,
  eventInCurrentWeek,
  localDateTimeInput,
  todayBirthDateIso,
  todayIsoDate,
} from '../../helpers/test-data.helper';
import {
  AgendaCalendarPage,
  AttendancePage,
  DocumentsPage,
  SchedulesBoardPage,
  SecretariatDashboardPage,
  VisitorsPage,
} from '../../pages/secretariat.page';

async function waitForBirthdayEvent(
  api: ApiClient,
  memberId: string,
  range: { from: string; to: string },
): Promise<boolean> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const event = await api.findBirthdayEventForMember(memberId, range.from, range.to);
    if (event) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

test.describe('Secretariat module', () => {
  const calendarEventIds: string[] = [];
  const visitorIds: string[] = [];
  const attendanceIds: string[] = [];
  const documentIds: string[] = [];
  const memberIds: string[] = [];
  const ministryIds: string[] = [];
  const assignmentIds: string[] = [];

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of assignmentIds.splice(0)) {
      await api.deleteScheduleAssignment(id).catch(() => undefined);
    }
    for (const id of calendarEventIds.splice(0)) {
      await api.deleteCalendarEvent(id).catch(() => undefined);
    }
    for (const id of documentIds.splice(0)) {
      await api.deleteDocument(id).catch(() => undefined);
    }
    for (const id of attendanceIds.splice(0)) {
      await api.deleteAttendance(id).catch(() => undefined);
    }
    for (const id of visitorIds.splice(0)) {
      await api.deleteVisitor(id).catch(() => undefined);
    }
    for (const ministryId of ministryIds.splice(0)) {
      await api.deleteMinistry(ministryId).catch(() => undefined);
    }
    for (const id of memberIds.splice(0)) {
      await api.deleteMember(id).catch(() => undefined);
    }
  });

  test('SEC-01 — dashboard widgets carregam', async ({ page }) => {
    const dashboard = new SecretariatDashboardPage(page);
    await dashboard.goto();
    await expect(page.getByTestId('secretariat-dashboard-cards')).toBeVisible();
    await expect(page.getByTestId('secretariat-attendance-chart')).toBeVisible();
    await expect(page.getByTestId('secretariat-visitors-chart')).toBeVisible();
  });

  test('SEC-02 — agenda: criar evento manual', async ({ page }) => {
    const title = e2eCalendarEventTitle('SEC02');
    const { startsAt, endsAt } = eventInCurrentWeek();
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    const agenda = new AgendaCalendarPage(page);
    await agenda.goto();
    await agenda.openCreateDialog();
    await agenda.fillEventForm({
      title,
      startsAt: localDateTimeInput(start),
      endsAt: localDateTimeInput(end),
    });
    await agenda.saveEventForm();

    const api = await ApiClient.asAdmin();
    const range = currentYearCalendarRange();
    const eventId = (await api.findCalendarEventIdByTitle(title, range.from, range.to)) ?? '';
    expect(eventId).toBeTruthy();
    calendarEventIds.push(eventId);

    await agenda.switchToDayView();
    if (start.getDate() !== new Date().getDate()) {
      await page.getByRole('button', { name: /^Próximo$|^Next$/i }).first().click();
      await page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
    }
    await agenda.clickCalendarEvent(title, { ensureDayView: false });
    await agenda.deleteCurrentEvent();
    calendarEventIds.splice(calendarEventIds.indexOf(eventId), 1);
  });

  test('SEC-03 — agenda: evento birthday read-only', async ({ page }) => {
    const fullName = e2eMemberName('SEC03');
    const birthDate = todayBirthDateIso(1992);
    const range = currentYearCalendarRange();

    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName, birthDate, status: 'active' });
    memberIds.push(member.id);

    const hasBirthday = await waitForBirthdayEvent(api, member.id, range);
    expect(hasBirthday).toBe(true);

    const birthdayTitle = `Aniversário: ${fullName}`;
    const agenda = new AgendaCalendarPage(page);
    await agenda.goto();
    await agenda.goToToday();
    await agenda.clickCalendarEvent(birthdayTitle);

    await expect(page.getByTestId('agenda-birthday-readonly')).toBeVisible();
    await expect(page.getByTestId('agenda-form-save')).toHaveCount(0);
  });

  test('SEC-02b — agenda: vigília cross-midnight', async ({ page }) => {
    const title = e2eCalendarEventTitle('SEC02b');
    const { formStartsAt, formEndsAt } = eventCrossMidnightInCurrentWeek();
    const start = new Date(formStartsAt);

    const agenda = new AgendaCalendarPage(page);
    await agenda.goto();
    await agenda.openCreateDialog();
    await agenda.fillEventForm({
      title,
      startsAt: formStartsAt,
      endsAt: formEndsAt,
    });
    await expect(page.getByTestId('agenda-cross-midnight-hint')).toBeVisible();
    await agenda.saveEventForm();

    const api = await ApiClient.asAdmin();
    const range = currentYearCalendarRange();
    const events = await api.findCalendarEvents({ from: range.from, to: range.to });
    const saved = events.find((event) => event.title === title);
    expect(saved).toBeTruthy();
    expect(saved!.id).toBeTruthy();
    calendarEventIds.push(saved!.id);

    const savedStart = new Date(saved!.startsAt);
    const savedEnd = new Date(saved!.endsAt);
    expect(savedEnd.getTime()).toBeGreaterThan(savedStart.getTime());
    expect(savedEnd.getDate()).toBeGreaterThan(savedStart.getDate());

    await agenda.switchToDayView();
    if (start.getDate() !== new Date().getDate()) {
      await page.getByRole('button', { name: /^Próximo$|^Next$/i }).first().click();
      await page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
    }
    await expect(page.locator('.cal-event').filter({ hasText: title }).first()).toBeVisible({
      timeout: 15000,
    });

    await agenda.clickCalendarEvent(title, { ensureDayView: false });
    await agenda.deleteCurrentEvent();
    calendarEventIds.splice(calendarEventIds.indexOf(saved!.id), 1);
  });

  test('SEC-02c — agenda: evento madrugada', async ({ page }) => {
    const title = e2eCalendarEventTitle('SEC02c');
    const { formStartsAt, formEndsAt } = eventEarlyMorningInCurrentWeek();
    const start = new Date(formStartsAt);

    const agenda = new AgendaCalendarPage(page);
    await agenda.goto();
    await agenda.openCreateDialog();
    await agenda.fillEventForm({
      title,
      startsAt: formStartsAt,
      endsAt: formEndsAt,
    });
    await agenda.saveEventForm();

    const api = await ApiClient.asAdmin();
    const range = currentYearCalendarRange();
    const eventId = (await api.findCalendarEventIdByTitle(title, range.from, range.to)) ?? '';
    expect(eventId).toBeTruthy();
    calendarEventIds.push(eventId);

    await agenda.switchToDayView();
    if (start.getDate() !== new Date().getDate()) {
      await page.getByRole('button', { name: /^Próximo$|^Next$/i }).first().click();
      await page.getByText(/Carregando|Loading/i).waitFor({ state: 'hidden' }).catch(() => undefined);
    }
    await expect(page.locator('.cal-event').filter({ hasText: title }).first()).toBeVisible({
      timeout: 15000,
    });

    await agenda.clickCalendarEvent(title, { ensureDayView: false });
    await agenda.deleteCurrentEvent();
    calendarEventIds.splice(calendarEventIds.indexOf(eventId), 1);
  });

  test('SEC-04 — visitantes: CRUD', async ({ page }) => {
    const fullName = e2eVisitorName('SEC04');
    const visitDate = todayIsoDate();
    const visitors = new VisitorsPage(page);
    await visitors.goto();

    await visitors.openCreateDialog();
    await visitors.fillVisitorForm({ fullName, visitDate });
    await visitors.saveVisitorForm();

    const api = await ApiClient.asAdmin();
    const visitorId = (await api.findVisitorIdByFullName(fullName)) ?? '';
    expect(visitorId).toBeTruthy();
    visitorIds.push(visitorId);
    await expect(visitors.row(visitorId)).toContainText(fullName);

    const editedName = `${fullName} Editado`;
    await visitors.openEdit(visitorId);
    await page.getByTestId('visitor-form-full-name').fill(editedName);
    await visitors.saveVisitorForm();
    await expect(visitors.row(visitorId)).toContainText(editedName);

    await visitors.deleteVisitor(visitorId);
    visitorIds.splice(visitorIds.indexOf(visitorId), 1);
  });

  test('SEC-05 — visitantes: converter em membro', async ({ page }) => {
    const fullName = e2eVisitorName('SEC05');
    const visitDate = todayIsoDate();

    const api = await ApiClient.asAdmin();
    const visitor = await api.createVisitor({ fullName, visitDate });
    visitorIds.push(visitor.id);

    const visitors = new VisitorsPage(page);
    await visitors.goto();
    await visitors.openConvert(visitor.id);
    await visitors.submitConvert();

    await expect(visitors.row(visitor.id)).toContainText(/Integrado|Integrated/i);

    const memberId = (await api.findMemberIdByFullName(fullName)) ?? '';
    expect(memberId).toBeTruthy();
    memberIds.push(memberId);
  });

  test('SEC-06 — presença culto: CRUD', async ({ page }) => {
    const eventDate = todayIsoDate();
    const attendance = new AttendancePage(page);
    await attendance.goto();

    await attendance.openCreateDialog();
    await attendance.fillAttendanceForm({ eventDate, eventType: 'service', totalPresent: '120' });
    await attendance.saveAttendanceForm();

    const api = await ApiClient.asAdmin();
    const recordId = (await api.findAttendanceIdByDate(eventDate)) ?? '';
    expect(recordId).toBeTruthy();
    attendanceIds.push(recordId);
    await expect(attendance.row(recordId)).toContainText('120');

    await attendance.openEdit(recordId);
    await page.getByTestId('attendance-form-total').fill('150');
    await attendance.saveAttendanceForm();
    await expect(attendance.row(recordId)).toContainText('150');

    await attendance.deleteAttendance(recordId);
    attendanceIds.splice(attendanceIds.indexOf(recordId), 1);
  });

  test('SEC-07 — documentos: upload PDF e download', async ({ page }) => {
    const title = e2eDocumentTitle('SEC07');
    const documentDate = todayIsoDate();
    const documents = new DocumentsPage(page);
    await documents.goto();

    await documents.openCreateDialog();
    await documents.fillDocumentForm({ title, documentDate });
    await documents.saveDocumentForm('create');

    const api = await ApiClient.asAdmin();
    const documentId = (await api.findDocumentIdByTitle(title)) ?? '';
    expect(documentId).toBeTruthy();
    documentIds.push(documentId);

    await documents.uploadPdfInForm();
    await documents.downloadFromForm();
    await page.getByRole('button', { name: /^Cancelar$|^Cancel$|^Cancelar$/i }).click();
    await page.getByTestId('document-form').waitFor({ state: 'hidden' });
  });

  test('SEC-08 — escalas: semana atual e assignment', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const ministryName = e2eMinistryName('SEC08');
    const memberName = e2eMemberName('SEC08');
    const eventTitle = e2eCalendarEventTitle('SEC08');
    const { startsAt, endsAt } = eventInCurrentWeek();

    const ministry = await api.createMinistry({ name: ministryName, status: 'active' });
    ministryIds.push(ministry.id);
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    await api.addMinistryMember(ministry.id, member.id);

    const event = await api.createCalendarEvent({
      title: eventTitle,
      type: 'service',
      startsAt,
      endsAt,
    });
    calendarEventIds.push(event.id);

    const schedules = new SchedulesBoardPage(page);
    await schedules.goto();
    await schedules.goCurrentWeek();
    await page.getByTestId('schedules-week-next').click();
    await page.getByTestId('schedules-week-prev').click();
    await expect(schedules.eventCard(event.id)).toBeVisible();
    await schedules.openEditorForEvent(event.id);
    await schedules.fillAssignmentForEvent({
      ministryId: ministry.id,
      memberId: member.id,
      roleLabel: 'Recepção E2E',
    });
    await page.getByRole('button', { name: /^Cancelar$|^Cancel$/i }).click();
    await page.getByTestId('schedule-editor-form').waitFor({ state: 'hidden' });

    const created = await api.bulkUpsertScheduleAssignments(event.id, ministry.id, [
      { memberId: member.id, roleLabel: 'Recepção E2E', confirmed: false },
    ]);
    expect(created.length).toBeGreaterThan(0);
    assignmentIds.push(created[0].id);

    await page.reload();
    await schedules.goto();
    await schedules.goCurrentWeek();

    await expect(schedules.eventCard(event.id)).toContainText(memberName);
    await expect(schedules.eventCard(event.id)).toContainText('Recepção E2E');
  });
});
