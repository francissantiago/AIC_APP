import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eMemberName, e2eMinistryName } from '../../helpers/test-data.helper';
import { MinistriesPage } from '../../pages/ministries.page';

test.describe('Ministries module', () => {
  let ministryId = '';
  const memberIds: string[] = [];

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    if (ministryId) {
      await api.deleteMinistry(ministryId).catch(() => undefined);
      ministryId = '';
    }
    for (const id of memberIds.splice(0)) {
      await api.deleteMember(id).catch(() => undefined);
    }
  });

  test('MIN-01 — criar, editar e excluir ministério', async ({ page }) => {
    const name = e2eMinistryName('MIN01');
    const ministries = new MinistriesPage(page);
    await ministries.goto();
    await ministries.openCreateDialog();
    await ministries.fillCreateForm(name);
    await ministries.saveForm();

    const api = await ApiClient.asAdmin();
    ministryId = (await api.findMinistryIdByName(name)) ?? '';
    expect(ministryId).toBeTruthy();

    await ministries.search(name);
    await ministries.openEdit(ministryId);
    await page.getByTestId('ministry-form-name').fill(`${name} Editado`);
    await ministries.saveForm();
    await expect(ministries.row(ministryId)).toContainText(`${name} Editado`);

    await ministries.deleteMinistry(ministryId);
    const deletedId = ministryId;
    ministryId = '';
    await ministries.search(`${name} Editado`);
    await expect(page.getByTestId(`ministry-row-${deletedId}`)).toHaveCount(0);
  });

  test('MIN-02 — adicionar e remover membro no painel', async ({ page }) => {
    const name = e2eMinistryName('MIN02');
    const memberName = e2eMemberName('MIN02-M');
    const api = await ApiClient.asAdmin();
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    memberIds.push(member.id);
    const ministry = await api.createMinistry({ name, status: 'active' });
    ministryId = ministry.id;

    const ministries = new MinistriesPage(page);
    await ministries.goto();
    await ministries.search(name);
    await ministries.openMembers(ministryId);
    await ministries.addMember(member.id);
    await ministries.removeMember(member.id);
    await expect(page.getByTestId(`ministry-member-row-${member.id}`)).toHaveCount(0);
  });

  test('MIN-03 — filtro por status inativo', async ({ page }) => {
    const activeName = e2eMinistryName('MIN03-A');
    const inactiveName = e2eMinistryName('MIN03-I');
    const api = await ApiClient.asAdmin();
    const active = await api.createMinistry({ name: activeName, status: 'active' });
    const inactive = await api.createMinistry({ name: inactiveName, status: 'inactive' });
    ministryId = inactive.id;

    const ministries = new MinistriesPage(page);
    await ministries.goto();
    await ministries.filterStatus('inactive');
    await ministries.search(inactiveName);
    await expect(ministries.row(inactive.id)).toBeVisible();
    await expect(ministries.row(active.id)).toHaveCount(0);

    await api.deleteMinistry(active.id).catch(() => undefined);
  });
});
