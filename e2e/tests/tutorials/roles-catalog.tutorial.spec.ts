import { test, expect } from '../../fixtures/tutorial.fixture';
import { RolesPage } from '../../pages/roles.page';

test.describe.configure({ mode: 'serial' });

test('roles-catalog — permissões do papel ADMIN', async ({ page, tutorialStep }) => {
  const roles = new RolesPage(page);

  await tutorialStep('Abrir catálogo de papéis', async () => {
    await roles.goto();
    await expect(roles.row('ADMIN')).toBeVisible();
  });

  await tutorialStep('Visualizar permissões do ADMIN', async () => {
    await roles.openEdit('ADMIN');
    await expect(page.getByTestId('role-form')).toBeVisible();
    await expect(page.getByTestId('role-permission-members-read')).toBeVisible();
    await page.getByTestId('role-form-cancel').click();
    await expect(page.getByTestId('role-form')).toHaveCount(0);
  });
});
