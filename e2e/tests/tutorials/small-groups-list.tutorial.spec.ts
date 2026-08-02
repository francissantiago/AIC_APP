import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eSmallGroupName } from "../../helpers/test-data.helper";
import { SmallGroupsPage } from "../../pages/small-groups.page";

test.describe.configure({ mode: "serial" });

test.describe("small-groups-list tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("small-groups-list — cadastrar célula", async ({
    page,
    tutorialStep,
  }) => {
    const groupName = e2eSmallGroupName("TUTORIAL Célula");
    const groups = new SmallGroupsPage(page);

    await tutorialStep("Abrir lista de células", async () => {
      await groups.goto();
    });

    await tutorialStep("Cadastrar célula de demonstração", async () => {
      await groups.openCreateDialog();
      await groups.fillCreateForm(groupName);
      await groups.saveForm();
      await groups.search(groupName);

      const api = await ApiClient.asAdmin();
      const groupId = await waitForResourceId(
        () => api.findSmallGroupIdByName(groupName),
        "Célula tutorial",
      );
      cleanup.smallGroupIds.push(groupId);
      await expect(groups.row(groupId)).toBeVisible();
    });
  });
});
