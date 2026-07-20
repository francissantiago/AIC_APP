import { test, expect } from '../../fixtures/authenticated.fixture';
import { MembersPage } from '../../pages/members.page';

test.describe('Members smoke', () => {
  test('MEM-01 smoke — lista carrega e dialog create abre/fecha', async ({ page }) => {
    const members = new MembersPage(page);
    await members.goto();
    await members.expectListReady();

    await members.openCreateDialog();
    await expect(page.getByTestId('member-form-full-name')).toBeVisible();
    await members.cancelForm();
    await expect(page.getByTestId('member-form')).toHaveCount(0);
  });
});
