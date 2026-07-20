import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eClassName, e2eMemberName, monthRangeIsoDate, todayIsoDate } from '../../helpers/test-data.helper';
import { EbdPage } from '../../pages/ebd.page';

test.describe('EBD module', () => {
  let classId = '';
  const memberIds: string[] = [];
  const sessionDate = todayIsoDate();

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    if (classId) {
      await api.deleteClass(classId).catch(() => undefined);
      classId = '';
    }
    for (const id of memberIds.splice(0)) {
      await api.deleteMember(id).catch(() => undefined);
    }
  });

  test('EBD-01 — criar, editar e excluir classe', async ({ page }) => {
    const name = e2eClassName('EBD01');
    const ebd = new EbdPage(page);
    await ebd.goto();
    await ebd.openCreateDialog();
    await ebd.fillCreateForm(name);
    await ebd.saveForm();

    const api = await ApiClient.asAdmin();
    classId = (await api.findClassIdByName(name)) ?? '';
    expect(classId).toBeTruthy();

    await ebd.search(name);
    await ebd.openEdit(classId);
    await page.getByTestId('class-form-name').fill(`${name} Editada`);
    await ebd.saveForm();
    await expect(ebd.row(classId)).toContainText(`${name} Editada`);

    await ebd.deleteClass(classId);
    const deletedId = classId;
    classId = '';
    await ebd.search(`${name} Editada`);
    await expect(page.getByTestId(`class-row-${deletedId}`)).toHaveCount(0);
  });

  test('EBD-02 — matricular membro na turma', async ({ page }) => {
    const name = e2eClassName('EBD02');
    const memberName = e2eMemberName('EBD02-M');
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const created = await api.createClass({ name, status: 'active' });
    classId = created.id;

    const ebd = new EbdPage(page);
    await ebd.goto();
    await ebd.search(name);
    await ebd.openEnrollments(classId);
    await ebd.enrollMember(member.id);
    await expect(page.getByTestId(`class-enrollment-row-${member.id}`)).toContainText(memberName);
  });

  test('EBD-03 — chamada de presença na sessão', async ({ page }) => {
    const name = e2eClassName('EBD03');
    const memberName = e2eMemberName('EBD03-M');
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const created = await api.createClass({ name, status: 'active' });
    classId = created.id;
    await api.enrollClassMember(classId, member.id);

    const ebd = new EbdPage(page);
    await ebd.goto();
    await ebd.search(name);
    await ebd.openAttendance(classId);
    await ebd.setSessionDate(sessionDate);
    await ebd.markMemberPresent(member.id);
    await ebd.saveAttendance();

    await expect(page.getByTestId(`class-attendance-row-${member.id}`)).toBeVisible();
  });

  test('EBD-04 — relatório de frequência por período', async ({ page }) => {
    const name = e2eClassName('EBD04');
    const memberName = e2eMemberName('EBD04-M');
    const range = monthRangeIsoDate();
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const created = await api.createClass({ name, status: 'active' });
    classId = created.id;
    await api.enrollClassMember(classId, member.id);
    await api.upsertClassAttendance(classId, sessionDate, [{ memberId: member.id, present: true }]);

    const ebd = new EbdPage(page);
    await ebd.gotoReports();
    await ebd.filterReport(classId, range.from, range.to);

    await expect(page.getByTestId('class-report-table')).toBeVisible();
    await expect(page.getByTestId('class-report-table')).toContainText(memberName);
  });
});
