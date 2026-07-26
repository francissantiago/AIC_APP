import { test, expect } from '../../fixtures/tutorial.fixture';
import { ProfilePage } from '../../pages/profile.page';

test.describe.configure({ mode: 'serial' });

test('profile — atualizar nome do perfil', async ({ page, tutorialStep }) => {
  const profile = new ProfilePage(page);

  await tutorialStep('Abrir página de perfil', async () => {
    await profile.goto();
    await expect(page.getByTestId('profile-page')).toBeVisible();
  });

  await tutorialStep('Alterar nome temporariamente e reverter', async () => {
    const originalName = (await profile.fullNameInput().inputValue()).replace(/\s+TUTORIAL$/, '');
    const temporaryName = `${originalName} TUTORIAL`;
    await profile.updateFullName(temporaryName);
    await profile.updateFullName(originalName);
  });
});
