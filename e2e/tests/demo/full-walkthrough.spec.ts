import { test, expect } from '@playwright/test';

import {
  cleanupDemoState,
  createDemoCleanupState,
  waitForResourceId,
} from '../../helpers/demo-cleanup.helper';
import { ApiClient } from '../../helpers/api-client.helper';
import {
  currentYearCalendarRange,
  e2eAnnouncementTitle,
  e2eAssetName,
  e2eCalendarEventTitle,
  e2eClassName,
  e2eCongregationBranchName,
  e2eDocumentTitle,
  e2eFamilyName,
  e2eFinanceEntryDescription,
  e2eMemberName,
  e2eMinistryName,
  e2eSmallGroupName,
  e2eVisitorName,
  eventInCurrentWeek,
  localDateTimeInput,
  monthRangeIsoDate,
  todayIsoDate,
} from '../../helpers/test-data.helper';
import { AnnouncementsPage } from '../../pages/announcements.page';
import { AppShellPage } from '../../pages/app-shell.page';
import { CongregationPage, CongregationsListPage } from '../../pages/congregation.page';
import { EbdPage } from '../../pages/ebd.page';
import {
  AssetsPage,
  FinanceDashboardPage,
  FinanceEntriesPage,
  FinanceReportsPage,
} from '../../pages/finance.page';
import { FamiliesPage } from '../../pages/families.page';
import { LoginPage } from '../../pages/login.page';
import { MembersPage } from '../../pages/members.page';
import { MinistriesPage } from '../../pages/ministries.page';
import { ProfilePage } from '../../pages/profile.page';
import { RolesPage } from '../../pages/roles.page';
import {
  AgendaCalendarPage,
  AttendancePage,
  DocumentsPage,
  SchedulesBoardPage,
  SecretariatDashboardPage,
  VisitorsPage,
} from '../../pages/secretariat.page';
import { SmallGroupsPage } from '../../pages/small-groups.page';
import { UsersPage } from '../../pages/users.page';

test.describe.configure({ mode: 'serial' });

test.describe('Demo walkthrough', () => {
  test.setTimeout(3_600_000);

  const cleanup = createDemoCleanupState();

  test.afterAll(async () => {
    await cleanupDemoState(cleanup);
  });

  test('roteiro comercial completo — 10 capítulos', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    test.skip(!password, 'E2E_ADMIN_PASSWORD não configurado');

    const shell = new AppShellPage(page);
    const apiRef: { client?: ApiClient } = {};

    await test.step('Capítulo 1 — Intro: login, shell e idioma', async () => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await expect(page.getByTestId('language-switcher')).toBeVisible();
      await loginPage.login(email, password);
      await expect(page).not.toHaveURL(/\/login$/);

      await shell.expectLoaded();
      await expect(page.getByTestId('notifications-bell')).toBeVisible();
      await expect(page.getByTestId('language-switcher')).toBeVisible();
      await expect(page.getByTestId('app-sidebar-nav')).toBeVisible();
      await shell.expandSubmenu('nav-toggle-finance');
      await shell.expandSubmenu('nav-toggle-secretariat');
    });

    const announcementTitle = e2eAnnouncementTitle('DEMO Aviso');
    await test.step('Capítulo 2 — Comunicação: board e novo aviso', async () => {
      const announcements = new AnnouncementsPage(page);
      await announcements.goto();
      await announcements.expectBoardReady();
      await announcements.openCreateDialog();
      await announcements.fillForm(
        announcementTitle,
        'Demonstração E2E — aviso publicado para a congregação.',
      );
      await announcements.saveForm();
      await expect(announcements.board()).toContainText(announcementTitle);

      const api = await ApiClient.asAdmin();
      apiRef.client = api;
      const announcementId = await waitForResourceId(
        () => api.findAnnouncementIdByTitle(announcementTitle),
        'Aviso demo',
      );
      cleanup.announcementIds.push(announcementId);
    });

    const memberName = e2eMemberName('DEMO Membro');
    const familyName = e2eFamilyName('DEMO Família');
    let memberId = '';
    let familyId = '';

    await test.step('Capítulo 3 — Pessoas: membros, famílias e aniversários', async () => {
      const members = new MembersPage(page);
      await members.goto();
      await members.expectListReady();
      await members.openCreateDialog();
      await members.fillCreateForm({ fullName: memberName, status: 'active' });
      await members.saveForm();
      await members.search(memberName);

      const api = apiRef.client ?? (await ApiClient.asAdmin());
      memberId = await waitForResourceId(() => api.findMemberIdByFullName(memberName), 'Membro demo');
      cleanup.memberIds.push(memberId);
      await expect(members.row(memberId)).toBeVisible();

      const families = new FamiliesPage(page);
      await families.goto();
      await families.openCreateDialog();
      await families.fillCreateForm(familyName);
      await families.saveForm();
      await families.search(familyName);

      familyId = await waitForResourceId(() => api.findFamilyIdByName(familyName), 'Família demo');
      cleanup.familyIds.push(familyId);
      await families.openMembers(familyId);
      await families.addMember(memberId);

      await families.gotoBirthdaysReport();
      await families.filterBirthdaysByMonth(new Date().getMonth() + 1);
      await expect(page.getByTestId('family-birthdays-report')).toBeVisible();
    });

    const ministryName = e2eMinistryName('DEMO Ministério');
    const className = e2eClassName('DEMO Classe');
    const groupName = e2eSmallGroupName('DEMO Célula');
    let ministryId = '';
    let classId = '';
    let groupId = '';

    await test.step('Capítulo 4 — Organização: ministérios, EBD e células', async () => {
      const ministries = new MinistriesPage(page);
      await ministries.goto();
      await ministries.openCreateDialog();
      await ministries.fillCreateForm(ministryName);
      await ministries.saveForm();
      await ministries.search(ministryName);

      const api = apiRef.client ?? (await ApiClient.asAdmin());
      ministryId = await waitForResourceId(() => api.findMinistryIdByName(ministryName), 'Ministério demo');
      cleanup.ministryIds.push(ministryId);
      await ministries.openMembers(ministryId);
      await ministries.addMember(memberId);

      const ebd = new EbdPage(page);
      await ebd.goto();
      await ebd.openCreateDialog();
      await ebd.fillCreateForm(className);
      await ebd.saveForm();
      await ebd.search(className);

      classId = await waitForResourceId(() => api.findClassIdByName(className), 'Classe demo');
      cleanup.classIds.push(classId);
      await ebd.openEnrollments(classId);
      await ebd.enrollMember(memberId);
      await ebd.openAttendance(classId);
      await ebd.setSessionDate(todayIsoDate());
      await ebd.markMemberPresent(memberId);
      await ebd.saveAttendance();

      const groups = new SmallGroupsPage(page);
      await groups.goto();
      await groups.openCreateDialog();
      await groups.fillCreateForm(groupName);
      await groups.saveForm();
      await groups.search(groupName);

      groupId = await waitForResourceId(() => api.findSmallGroupIdByName(groupName), 'Célula demo');
      cleanup.smallGroupIds.push(groupId);
      await groups.openMembers(groupId);
      await groups.addMember(memberId);
      await groups.openMeetings(groupId);
      await groups.createMeeting(todayIsoDate(), 'Reunião demo E2E');
      await expect(page.locator('[data-testid^="small-group-meeting-row-"]').first()).toBeVisible();
    });

    const branchName = e2eCongregationBranchName('DEMO Filial');

    await test.step('Capítulo 5 — Congregação: sede e filiais', async () => {
      const api = apiRef.client ?? (await ApiClient.asAdmin());
      const base = await api.getCongregationBase();
      cleanup.restoreCongregationName = base.name;

      const congregation = new CongregationPage(page);
      await congregation.gotoActive();
      await expect(page.getByTestId('congregation-active')).toBeVisible();

      const branches = new CongregationsListPage(page);
      await branches.goto();
      await branches.openCreateBranch();
      await branches.fillBranchForm(branchName);
      await branches.saveBranchForm();
      await branches.search(branchName);

      const branchId = await waitForResourceId(
        () => api.findCongregationIdByName(branchName),
        'Filial demo',
      );
      cleanup.branchCongregationIds.push(branchId);
      await expect(branches.row(branchId)).toBeVisible();
    });

    const entryDescription = e2eFinanceEntryDescription('DEMO Dízimo');
    const assetName = e2eAssetName('DEMO Bem');

    await test.step('Capítulo 6 — Finanças: dashboard, dízimo, patrimônio e relatórios', async () => {
      const { from, to } = monthRangeIsoDate();
      const dashboard = new FinanceDashboardPage(page);
      await dashboard.goto();
      await dashboard.filterPeriod(from, to);
      await expect(page.getByTestId('finance-dashboard-cards')).toBeVisible();
      await expect(page.getByTestId('finance-monthly-chart')).toBeVisible();

      const entries = new FinanceEntriesPage(page);
      await entries.goto();
      await entries.openCreateDialog();
      await entries.fillEntryForm({
        type: 'income',
        categoryLabel: 'Dízimos',
        description: entryDescription,
        amount: '250.00',
        memberId,
      });
      await entries.saveEntryForm();

      const api = apiRef.client ?? (await ApiClient.asAdmin());
      const entryId = await waitForResourceId(
        () => api.findFinancialEntryIdByDescription(entryDescription),
        'Lançamento demo',
      );
      cleanup.financialEntryIds.push(entryId);
      await expect(entries.row(entryId)).toBeVisible();

      const assets = new AssetsPage(page);
      await assets.goto();
      await assets.openCreateDialog();
      await assets.fillAssetForm(assetName, '5000');
      await assets.saveAssetForm();

      const assetId = await waitForResourceId(() => api.findAssetIdByName(assetName), 'Patrimônio demo');
      cleanup.assetIds.push(assetId);
      await expect(assets.row(assetId)).toBeVisible();

      const reports = new FinanceReportsPage(page);
      await reports.goto();
      await reports.selectCashTab();
      await reports.applyCashPeriod(from, to);
      await expect(page.getByTestId('finance-reports-cash-table')).toBeVisible();
    });

    const eventTitle = e2eCalendarEventTitle('DEMO Evento');
    const visitorName = e2eVisitorName('DEMO Visitante');
    const documentTitle = e2eDocumentTitle('DEMO Documento');

    await test.step('Capítulo 7 — Secretaria: agenda, visitantes, presença, documentos e escalas', async () => {
      const secretariat = new SecretariatDashboardPage(page);
      await secretariat.goto();
      await expect(page.getByTestId('secretariat-dashboard-cards')).toBeVisible();

      const { startsAt, endsAt } = eventInCurrentWeek();
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      const agenda = new AgendaCalendarPage(page);
      await agenda.goto();
      await agenda.openCreateDialog();
      await agenda.fillEventForm({
        title: eventTitle,
        startsAt: localDateTimeInput(start),
        endsAt: localDateTimeInput(end),
      });
      await agenda.saveEventForm();
      await agenda.switchToDayView();

      const api = apiRef.client ?? (await ApiClient.asAdmin());
      const range = currentYearCalendarRange();
      const eventId = await waitForResourceId(
        () => api.findCalendarEventIdByTitle(eventTitle, range.from, range.to),
        'Evento agenda demo',
      );
      cleanup.calendarEventIds.push(eventId);

      const visitors = new VisitorsPage(page);
      await visitors.goto();
      await visitors.openCreateDialog();
      await visitors.fillVisitorForm({ fullName: visitorName, visitDate: todayIsoDate() });
      await visitors.saveVisitorForm();

      const visitorId = await waitForResourceId(
        () => api.findVisitorIdByFullName(visitorName),
        'Visitante demo',
      );
      cleanup.visitorIds.push(visitorId);
      await visitors.openConvert(visitorId);
      await visitors.submitConvert();

      const convertedMemberId = await waitForResourceId(
        () => api.findMemberIdByFullName(visitorName),
        'Membro convertido demo',
      );
      cleanup.memberIds.push(convertedMemberId);

      const attendance = new AttendancePage(page);
      await attendance.goto();
      await attendance.openCreateDialog();
      await attendance.fillAttendanceForm({
        eventDate: todayIsoDate(),
        eventType: 'service',
        totalPresent: '180',
      });
      await attendance.saveAttendanceForm();

      const attendanceId = await waitForResourceId(
        () => api.findAttendanceIdByDate(todayIsoDate()),
        'Presença demo',
      );
      cleanup.attendanceIds.push(attendanceId);

      const documents = new DocumentsPage(page);
      await documents.goto();
      await documents.openCreateDialog();
      await documents.fillDocumentForm({ title: documentTitle, documentDate: todayIsoDate() });
      await documents.saveDocumentForm('create');
      await documents.uploadPdfInForm();

      const documentId = await waitForResourceId(
        () => api.findDocumentIdByTitle(documentTitle),
        'Documento demo',
      );
      cleanup.documentIds.push(documentId);
      await expect(documents.row(documentId)).toBeVisible();

      const schedules = new SchedulesBoardPage(page);
      await schedules.goto();
      await schedules.goCurrentWeek();
      await expect(page.getByTestId('schedules-board')).toBeVisible();
    });

    await test.step('Capítulo 8 — Governança: usuários e papéis', async () => {
      const users = new UsersPage(page);
      await users.goto();
      await expect(page.getByTestId('user-table')).toBeVisible();
      await users.search('admin');
      await expect(users.row('admin')).toBeVisible();

      const roles = new RolesPage(page);
      await roles.goto();
      await expect(roles.row('ADMIN')).toBeVisible();
      await roles.openEdit('ADMIN');
      await expect(page.getByTestId('role-form')).toBeVisible();
      await expect(page.getByTestId('role-permission-members-read')).toBeVisible();
      await page.getByTestId('role-form-cancel').click();
      await expect(page.getByTestId('role-form')).toHaveCount(0);
    });

    await test.step('Capítulo 9 — Perfil: alterar nome e reverter', async () => {
      const profile = new ProfilePage(page);
      await profile.goto();

      const originalName = (await profile.fullNameInput().inputValue()).replace(/\s+DEMO$/, '');
      const temporaryName = `${originalName} DEMO`;
      await profile.updateFullName(temporaryName);
      await profile.updateFullName(originalName);
    });

    await test.step('Capítulo 10 — Encerramento: logout', async () => {
      await shell.logout();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByTestId('login-form')).toBeVisible();
    });
  });
});
