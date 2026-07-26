import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { e2eConstructionProjectName, e2eMinistryName } from '../../helpers/test-data.helper';
import { ConstructionsPage } from '../../pages/constructions.page';

test.describe('Constructions module', () => {
  const ministryIds: string[] = [];
  const projectIds: string[] = [];

  test.afterEach(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of projectIds.splice(0)) {
      await api.deleteConstructionProject(id).catch(() => undefined);
    }
    for (const id of ministryIds.splice(0)) {
      await api.deleteMinistry(id).catch(() => undefined);
    }
  });

  test('CN-01 — criar projeto de obra', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const ministry = await api.createMinistry({ name: e2eMinistryName('CN01') });
    ministryIds.push(ministry.id);

    const projectName = e2eConstructionProjectName('CN01');
    const constructions = new ConstructionsPage(page);
    await constructions.gotoProjects();
    await constructions.openCreateProjectDialog();
    await constructions.fillProjectForm({ name: projectName, ministryId: ministry.id });
    await constructions.saveProjectForm();
    await constructions.search(projectName);

    const projectId = await waitForResourceId(
      () => api.findConstructionProjectIdByName(projectName),
      'Projeto de obra',
    );
    projectIds.push(projectId);
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible();
  });
});
