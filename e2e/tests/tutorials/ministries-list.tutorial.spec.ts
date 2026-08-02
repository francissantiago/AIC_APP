import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eMinistryName } from "../../helpers/test-data.helper";
import { MinistriesPage } from "../../pages/ministries.page";

test.describe.configure({ mode: "serial" });

test.describe("ministries-list tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("ministries-list — cadastrar ministério", async ({
    page,
    tutorialStep,
  }) => {
    const ministryName = e2eMinistryName("TUTORIAL Ministério");
    const ministries = new MinistriesPage(page);

    await tutorialStep("Abrir lista de ministérios", async () => {
      await ministries.goto();
    });

    await tutorialStep("Cadastrar ministério de demonstração", async () => {
      await ministries.openCreateDialog();
      await ministries.fillCreateForm(ministryName);
      await ministries.saveForm();
      await ministries.search(ministryName);

      const api = await ApiClient.asAdmin();
      const ministryId = await waitForResourceId(
        () => api.findMinistryIdByName(ministryName),
        "Ministério tutorial",
      );
      cleanup.ministryIds.push(ministryId);
      await expect(ministries.row(ministryId)).toBeVisible();
    });
  });
});
