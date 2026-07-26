import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import { e2eConstructionProjectName, e2eMinistryName } from '../../helpers/test-data.helper';
import { ConstructionsPage } from '../../pages/constructions.page';

test.describe.configure({ mode: 'serial' });

test.describe('constructions-projects tutorial', () => {
  const cleanup = createTutorialCleanupState();
  const constructionProjectIds: string[] = [];

  test.afterAll(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of constructionProjectIds.splice(0)) {
      await api.deleteConstructionProject(id).catch(() => undefined);
    }
    await cleanupTutorialState(cleanup);
  });

  test('constructions-projects — cadastrar obra', async ({ page, tutorialStep }) => {
    const api = await ApiClient.asAdmin();
    const ministryName = e2eMinistryName('TUTORIAL Obra Min');
    const ministry = await api.createMinistry({ name: ministryName });
    cleanup.ministryIds.push(ministry.id);

    const projectName = e2eConstructionProjectName('TUTORIAL Obra');
    const constructions = new ConstructionsPage(page);

    await tutorialStep('Abrir obras e projetos', async () => {
      await constructions.gotoProjects();
    });

    await tutorialStep('Cadastrar obra de demonstração', async () => {
      await constructions.openCreateProjectDialog();
      await constructions.fillProjectForm({ name: projectName, ministryId: ministry.id });
      await constructions.saveProjectForm();
      await constructions.search(projectName);

      const projectId = await waitForResourceId(
        () => api.findConstructionProjectIdByName(projectName),
        'Obra tutorial',
      );
      constructionProjectIds.push(projectId);
      await expect(page.getByRole('cell', { name: projectName })).toBeVisible();
    });
  });
});
