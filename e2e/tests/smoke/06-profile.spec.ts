import { test, expect } from '../../fixtures/authenticated.fixture';
import { ProfilePage } from '../../pages/profile.page';

test.describe('Profile smoke', () => {
  test('PRF-01 — profile carrega dados do admin', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(page.getByTestId('profile-form')).toBeVisible();
    await expect(profile.fullNameInput()).not.toHaveValue('');
  });
});
