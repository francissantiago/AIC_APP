import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import { e2eFamilyName, e2eMemberName } from '../../helpers/test-data.helper';
import { FamiliesPage } from '../../pages/families.page';

test.describe.configure({ mode: 'serial' });

test.describe('families-list tutorial', () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test('families-list — família e vínculo de membro', async ({ page, tutorialStep }) => {
    const api = await ApiClient.asAdmin();
    const memberName = e2eMemberName('TUTORIAL Fam Membro');
    const familyName = e2eFamilyName('TUTORIAL Família');
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    cleanup.memberIds.push(member.id);

    const families = new FamiliesPage(page);

    await tutorialStep('Abrir lista de famílias', async () => {
      await families.goto();
    });

    await tutorialStep('Criar família e vincular membro', async () => {
      await families.openCreateDialog();
      await families.fillCreateForm(familyName);
      await families.saveForm();
      await families.search(familyName);

      const familyId = await waitForResourceId(
        () => api.findFamilyIdByName(familyName),
        'Família tutorial',
      );
      cleanup.familyIds.push(familyId);
      await families.openMembers(familyId);
      await families.addMember(member.id);
      await expect(page.getByTestId(`family-member-row-${member.id}`)).toBeVisible();
    });
  });
});
