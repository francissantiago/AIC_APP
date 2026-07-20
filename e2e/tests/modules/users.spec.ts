import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eEmail, e2eUsername } from '../../helpers/test-data.helper';
import { UsersPage } from '../../pages/users.page';

test.describe('Users module', () => {
  const password = 'E2ePass123!';
  let username = '';
  let userId = '';

  test.afterEach(async () => {
    if (!userId) {
      return;
    }
    const api = await ApiClient.asAdmin();
    await api.deleteUser(userId).catch(() => undefined);
    userId = '';
  });

  test('USR-01 — listagem e busca por e-mail', async ({ page }) => {
    const users = new UsersPage(page);
    await users.goto();
    await users.search('admin@admin.com');
    await expect(users.row('admin')).toBeVisible();
  });

  test('USR-02 — criar usuário com papel LEADER', async ({ page }) => {
    username = e2eUsername('leader');
    const email = e2eEmail(username);

    const users = new UsersPage(page);
    await users.goto();
    await users.openCreateDialog();
    await users.fillCreateForm({
      username,
      email,
      fullName: `E2E Leader ${username}`,
      password,
      roleCode: 'LEADER',
    });
    await users.saveForm();

    await expect(users.row(username)).toBeVisible();

    const api = await ApiClient.asAdmin();
    userId = (await api.findUserIdByUsername(username)) ?? '';
    expect(userId).toBeTruthy();
  });

  test('USR-03 — editar usuário', async ({ page }) => {
    username = e2eUsername('edit');
    const email = e2eEmail(username);
    const api = await ApiClient.asAdmin();
    const leaderRoleId = await api.findRoleIdByCode('LEADER');
    const created = await api.createUser({
      username,
      email,
      fullName: 'Nome Original E2E',
      password,
      status: 'active',
      roleIds: [leaderRoleId],
    });
    userId = created.id;

    const users = new UsersPage(page);
    await users.goto();
    await users.openEdit(username);
    await page.getByTestId('user-form-full-name').fill('Nome Editado E2E');
    await users.saveForm();

    await expect(users.row(username)).toContainText('Nome Editado E2E');
  });

  test('USR-04 — desativar usuário', async ({ page }) => {
    username = e2eUsername('inactive');
    const email = e2eEmail(username);
    const api = await ApiClient.asAdmin();
    const leaderRoleId = await api.findRoleIdByCode('LEADER');
    const created = await api.createUser({
      username,
      email,
      fullName: 'Usuário Inativar E2E',
      password,
      status: 'active',
      roleIds: [leaderRoleId],
    });
    userId = created.id;

    const users = new UsersPage(page);
    await users.goto();
    await users.openEdit(username);
    await users.setStatus('inactive');
    await users.saveForm();

    await expect(users.row(username)).toContainText(/Inativo|Inactive/i);
  });
});
