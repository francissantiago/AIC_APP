import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import { e2eClassName, e2eMemberName } from '../../helpers/test-data.helper';
import { EbdPage } from '../../pages/ebd.page';

test.describe.configure({ mode: 'serial' });

test.describe('ebd-classes tutorial', () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test('ebd-classes — cadastrar classe EBD', async ({ page, tutorialStep }) => {
    const className = e2eClassName('TUTORIAL Classe');
    const ebd = new EbdPage(page);

    await tutorialStep('Abrir lista de classes EBD', async () => {
      await ebd.goto();
    });

    await tutorialStep('Cadastrar classe de demonstração', async () => {
      await ebd.openCreateDialog();
      await ebd.fillCreateForm(className);
      await ebd.saveForm();
      await ebd.search(className);

      const api = await ApiClient.asAdmin();
      const classId = await waitForResourceId(() => api.findClassIdByName(className), 'Classe tutorial');
      cleanup.classIds.push(classId);
      await expect(ebd.row(classId)).toBeVisible();
    });
  });
});
