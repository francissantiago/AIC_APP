import { test, expect } from '../../fixtures/tutorial.fixture';
import { UsersPage } from '../../pages/users.page';

test.describe.configure({ mode: 'serial' });

test('users-list — buscar usuário admin', async ({ page, tutorialStep }) => {
  const users = new UsersPage(page);

  await tutorialStep('Abrir gestão de usuários', async () => {
    await users.goto();
    await expect(page.getByTestId('user-table')).toBeVisible();
  });

  await tutorialStep('Localizar usuário administrador', async () => {
    await users.search('admin');
    await expect(users.row('admin')).toBeVisible();
  });
});
