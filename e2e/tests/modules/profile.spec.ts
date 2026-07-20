import { test, expect } from '../../fixtures/authenticated.fixture';
import { ProfilePage } from '../../pages/profile.page';

test.describe('Profile module', () => {
  test('PRF-01 — exibe dados do usuário logado', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await expect(profile.fullNameInput()).not.toHaveValue('');
    await expect(page.locator('#profile-username')).toHaveValue('admin');
    await expect(page.locator('#profile-email')).toHaveValue(/admin@admin\.com/i);
  });

  test('PRF-02 — alterar nome e reverter', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    const originalName = await profile.fullNameInput().inputValue();
    const temporaryName = `${originalName} E2E`;

    await profile.updateFullName(temporaryName);
    await expect(page.getByRole('status')).toBeVisible();
    await expect(profile.fullNameInput()).toHaveValue(temporaryName);

    await profile.updateFullName(originalName);
    await expect(profile.fullNameInput()).toHaveValue(originalName);
  });
});
