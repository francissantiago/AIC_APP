import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import {
  e2eSmallGroupName,
  monthRangeIsoDate,
} from "../../helpers/test-data.helper";
import { SmallGroupsPage } from "../../pages/small-groups.page";

test.describe.configure({ mode: "serial" });

test.describe("small-groups-frequency-report tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("small-groups-frequency-report — relatório por período", async ({
    page,
    tutorialStep,
  }) => {
    const api = await ApiClient.asAdmin();
    const groupName = e2eSmallGroupName("TUTORIAL Rel Célula");
    const created = await api.createSmallGroup({ name: groupName });
    cleanup.smallGroupIds.push(created.id);

    const groups = new SmallGroupsPage(page);
    const { from, to } = monthRangeIsoDate();

    await tutorialStep("Abrir relatório de frequência de células", async () => {
      await groups.gotoReports();
      await expect(
        page.getByTestId("small-group-frequency-report"),
      ).toBeVisible();
    });

    await tutorialStep("Filtrar por célula e período", async () => {
      await groups.filterReport(created.id, from, to);
      await expect(
        page.getByTestId("small-group-frequency-report"),
      ).toBeVisible();
    });
  });
});
