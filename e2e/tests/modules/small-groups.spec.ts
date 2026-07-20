import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import {
  e2eMemberName,
  e2eSmallGroupName,
  monthRangeIsoDate,
  todayIsoDate,
} from '../../helpers/test-data.helper';
import { SmallGroupsPage } from '../../pages/small-groups.page';

test.describe('Small groups module', () => {
  let groupId = '';
  let meetingId = '';
  const memberIds: string[] = [];
  const meetingDate = todayIsoDate();

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    if (groupId) {
      await api.deleteSmallGroup(groupId).catch(() => undefined);
      groupId = '';
    }
    meetingId = '';
    for (const id of memberIds.splice(0)) {
      await api.deleteMember(id).catch(() => undefined);
    }
  });

  test('SG-01 — criar, editar e excluir célula', async ({ page }) => {
    const name = e2eSmallGroupName('SG01');
    const groups = new SmallGroupsPage(page);
    await groups.goto();
    await groups.openCreateDialog();
    await groups.fillCreateForm(name);
    await groups.saveForm();

    const api = await ApiClient.asAdmin();
    groupId = (await api.findSmallGroupIdByName(name)) ?? '';
    expect(groupId).toBeTruthy();

    await groups.search(name);
    await groups.openEdit(groupId);
    await page.getByTestId('small-group-form-name').fill(`${name} Editada`);
    await groups.saveForm();
    await expect(groups.row(groupId)).toContainText(`${name} Editada`);

    await groups.deleteGroup(groupId);
    const deletedId = groupId;
    groupId = '';
    await groups.search(`${name} Editada`);
    await expect(page.getByTestId(`small-group-row-${deletedId}`)).toHaveCount(0);
  });

  test('SG-02 — adicionar e remover membro da célula', async ({ page }) => {
    const name = e2eSmallGroupName('SG02');
    const memberName = e2eMemberName('SG02-M');
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const group = await api.createSmallGroup({ name, status: 'active' });
    groupId = group.id;

    const groups = new SmallGroupsPage(page);
    await groups.goto();
    await groups.search(name);
    await groups.openMembers(groupId);
    await groups.addMember(member.id);
    await groups.removeMember(member.id);
    await expect(page.getByTestId(`small-group-member-row-${member.id}`)).toHaveCount(0);
  });

  test('SG-03 — reunião e registro de presença', async ({ page }) => {
    const name = e2eSmallGroupName('SG03');
    const memberName = e2eMemberName('SG03-M');
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const group = await api.createSmallGroup({ name, status: 'active' });
    groupId = group.id;
    await api.addSmallGroupMember(groupId, member.id);

    const groups = new SmallGroupsPage(page);
    await groups.goto();
    await groups.search(name);
    await groups.openMeetings(groupId);
    await groups.createMeeting(meetingDate, 'Tema E2E');

    const meetingRow = page.locator('[data-testid^="small-group-meeting-row-"]').filter({
      hasText: meetingDate,
    });
    await expect(meetingRow).toBeVisible();
    const meetingTestId = await meetingRow.getAttribute('data-testid');
    const resolvedMeetingId = meetingTestId?.replace('small-group-meeting-row-', '') ?? '';
    expect(resolvedMeetingId).toBeTruthy();
    meetingId = resolvedMeetingId;

    await groups.openMeetingAttendance(resolvedMeetingId);
    await groups.markMemberPresent(member.id);
    await groups.saveAttendance();
    await expect(page.getByTestId(`small-group-attendance-row-${member.id}`)).toBeVisible();
  });

  test('SG-04 — relatório de frequência por período', async ({ page }) => {
    const name = e2eSmallGroupName('SG04');
    const memberName = e2eMemberName('SG04-M');
    const range = monthRangeIsoDate();
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const group = await api.createSmallGroup({ name, status: 'active' });
    groupId = group.id;
    await api.addSmallGroupMember(groupId, member.id);
    const meeting = await api.createSmallGroupMeeting(groupId, {
      meetingDate,
      theme: 'Relatório E2E',
    });
    meetingId = meeting.id;
    await api.upsertSmallGroupAttendance(groupId, meeting.id, [
      { memberId: member.id, present: true },
    ]);

    const groups = new SmallGroupsPage(page);
    await groups.gotoReports();
    await groups.filterReport(groupId, range.from, range.to);

    await expect(page.getByTestId('small-group-report-table')).toBeVisible();
    await expect(page.getByTestId('small-group-report-table')).toContainText(memberName);
  });
});
