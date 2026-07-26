import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eSocialProjectName } from '../../helpers/test-data.helper';
import { SocialProjectsPage } from '../../pages/social-projects.page';

test.describe('Social projects module', () => {
  const projectIds: string[] = [];

  test.afterEach(async () => {
    if (projectIds.length === 0) {
      return;
    }
    const api = await ApiClient.asAdmin();
    for (const id of projectIds.splice(0)) {
      await api.deleteSocialProject(id).catch(() => undefined);
    }
  });

  test('SP-01 — criar e localizar projeto social', async ({ page }) => {
    const projectName = e2eSocialProjectName('SP01');
    const projects = new SocialProjectsPage(page);
    await projects.goto();
    await projects.openCreateDialog();
    await projects.fillCreateForm(projectName);
    await projects.saveForm();
    await projects.search(projectName);

    const api = await ApiClient.asAdmin();
    const projectId = await api.findSocialProjectIdByName(projectName);
    expect(projectId).toBeTruthy();
    if (projectId) {
      projectIds.push(projectId);
      await expect(projects.row(projectId)).toBeVisible();
    }
  });
});
