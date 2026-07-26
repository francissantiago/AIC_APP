import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import { e2eAssetName } from '../../helpers/test-data.helper';
import { AssetsPage } from '../../pages/finance.page';

test.describe.configure({ mode: 'serial' });

test.describe('finance-assets tutorial', () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test('finance-assets — cadastrar bem patrimonial', async ({ page, tutorialStep }) => {
    const assetName = e2eAssetName('TUTORIAL Bem');
    const assets = new AssetsPage(page);

    await tutorialStep('Abrir patrimônio', async () => {
      await assets.goto();
      await expect(page.getByTestId('assets-list')).toBeVisible();
    });

    await tutorialStep('Cadastrar bem de demonstração', async () => {
      await assets.openCreateDialog();
      await assets.fillAssetForm(assetName, '2500');
      await assets.saveAssetForm();

      const api = await ApiClient.asAdmin();
      const assetId = await waitForResourceId(() => api.findAssetIdByName(assetName), 'Patrimônio tutorial');
      cleanup.assetIds.push(assetId);
      await expect(assets.row(assetId)).toBeVisible();
    });
  });
});
