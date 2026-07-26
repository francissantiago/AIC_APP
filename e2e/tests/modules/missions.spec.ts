import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eMemberName, e2eMissionFieldName, todayIsoDate } from '../../helpers/test-data.helper';
import { MissionsPage } from '../../pages/missions.page';

test.describe('Missions module', () => {
  const memberIds: string[] = [];
  const missionFieldIds: string[] = [];

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of memberIds.splice(0)) {
      await api.deleteMember(id).catch(() => undefined);
    }
    for (const id of missionFieldIds.splice(0)) {
      await api.deleteMissionField(id).catch(() => undefined);
    }
  });

  test('MS-01 — criar designação missionária', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: e2eMemberName('MS01'), status: 'active' });
    memberIds.push(member.id);
    const field = await api.createMissionField({
      name: e2eMissionFieldName('MS01 Campo'),
      country: 'Brasil',
    });
    missionFieldIds.push(field.id);

    const missions = new MissionsPage(page);
    await missions.gotoAssignments();
    await missions.openCreateAssignmentDialog();
    await missions.fillAssignmentForm({
      memberId: member.id,
      missionFieldId: field.id,
      startDate: todayIsoDate(),
    });
    await missions.saveAssignmentForm();
    await expect(page.getByRole('cell', { name: member.fullName })).toBeVisible();
  });
});
