import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eRoleCode } from '../../helpers/test-data.helper';
import { RolesPage } from '../../pages/roles.page';

test.describe('Roles module', () => {
  let customRoleCode = '';
  let customRoleId = 0;

  test.afterEach(async () => {
    if (!customRoleId) {
      return;
    }
    const api = await ApiClient.asAdmin();
    await api.deleteRole(customRoleId).catch(() => undefined);
    customRoleId = 0;
    customRoleCode = '';
  });

  test('ROL-01 — lista papéis do sistema', async ({ page }) => {
    const roles = new RolesPage(page);
    await roles.goto();

    await expect(roles.row('ADMIN')).toBeVisible();
    await expect(roles.row('LEADER')).toBeVisible();
    await expect(roles.row('MEMBER')).toBeVisible();
  });

  test('ROL-02 — criar papel customizado com permissões subset', async ({ page }) => {
    customRoleCode = e2eRoleCode();

    const roles = new RolesPage(page);
    await roles.goto();
    await roles.openCreateDialog();
    await roles.fillCreateForm({
      code: customRoleCode,
      name: `Papel E2E ${customRoleCode}`,
      permissions: [{ resource: 'members', action: 'read' }],
    });
    await roles.saveForm();

    await expect(roles.row(customRoleCode)).toBeVisible();

    const api = await ApiClient.asAdmin();
    const listed = await api.listRoles();
    customRoleId = listed.find((role) => role.code === customRoleCode)?.id ?? 0;
    expect(customRoleId).toBeGreaterThan(0);
  });

  test('ROL-03 — editar permissões de papel custom', async ({ page }) => {
    customRoleCode = e2eRoleCode('EDT');
    const api = await ApiClient.asAdmin();
    const membersReadId = await api.findPermissionIdByCode('members:read');
    const created = await api.createRole({
      code: customRoleCode,
      name: `Edit E2E ${customRoleCode}`,
      permissionIds: [membersReadId],
    });
    customRoleId = created.id;

    const roles = new RolesPage(page);
    await roles.goto();
    await roles.openEdit(customRoleCode);
    await page.getByTestId('role-form-name').fill(`Editado ${customRoleCode}`);
    await page.getByTestId('role-permission-members-write').check();
    await roles.saveForm();

    await expect(roles.row(customRoleCode)).toContainText(`Editado ${customRoleCode}`);
  });

  test('ROL-04 — papel sistema não exibe botão excluir', async ({ page }) => {
    const roles = new RolesPage(page);
    await roles.goto();

    await expect(roles.deleteButton('ADMIN')).toHaveCount(0);
    await expect(roles.deleteButton('LEADER')).toHaveCount(0);
  });
});
