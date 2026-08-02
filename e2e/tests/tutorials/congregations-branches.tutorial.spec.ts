import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eCongregationBranchName } from "../../helpers/test-data.helper";
import { CongregationsListPage } from "../../pages/congregation.page";

test.describe.configure({ mode: "serial" });

test.describe("congregations-branches tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("congregations-branches — cadastrar filial", async ({
    page,
    tutorialStep,
  }) => {
    const branchName = e2eCongregationBranchName("TUTORIAL Filial");
    const branches = new CongregationsListPage(page);

    await tutorialStep("Abrir lista de filiais", async () => {
      await branches.goto();
      await expect(page.getByTestId("congregations-list")).toBeVisible();
    });

    await tutorialStep("Cadastrar filial de demonstração", async () => {
      await branches.openCreateBranch();
      await branches.fillBranchForm(branchName);
      await branches.saveBranchForm();
      await branches.search(branchName);

      const api = await ApiClient.asAdmin();
      const branchId = await waitForResourceId(
        () => api.findCongregationIdByName(branchName),
        "Filial tutorial",
      );
      cleanup.branchCongregationIds.push(branchId);
      await expect(branches.row(branchId)).toBeVisible();
    });
  });
});
