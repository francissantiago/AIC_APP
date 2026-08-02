import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eSocialProjectName } from "../../helpers/test-data.helper";
import { SocialProjectsPage } from "../../pages/social-projects.page";

test.describe.configure({ mode: "serial" });

test.describe("social-projects-list tutorial", () => {
  const cleanup = createTutorialCleanupState();
  const projectIds: string[] = [];

  test.afterAll(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of projectIds.splice(0)) {
      await api.deleteSocialProject(id).catch(() => undefined);
    }
    await cleanupTutorialState(cleanup);
  });

  test("social-projects-list — cadastrar projeto social", async ({
    page,
    tutorialStep,
  }) => {
    const projectName = e2eSocialProjectName("TUTORIAL Projeto");
    const projects = new SocialProjectsPage(page);

    await tutorialStep("Abrir projetos sociais", async () => {
      await projects.goto();
    });

    await tutorialStep("Cadastrar projeto de demonstração", async () => {
      await projects.openCreateDialog();
      await projects.fillCreateForm(projectName);
      await projects.saveForm();
      await projects.search(projectName);

      const api = await ApiClient.asAdmin();
      const projectId = await waitForResourceId(
        () => api.findSocialProjectIdByName(projectName),
        "Projeto social tutorial",
      );
      projectIds.push(projectId);
      await expect(projects.row(projectId)).toBeVisible();
    });
  });
});
