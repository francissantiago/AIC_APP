import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import {
  e2eClassName,
  monthRangeIsoDate,
} from "../../helpers/test-data.helper";
import { EbdPage } from "../../pages/ebd.page";

test.describe.configure({ mode: "serial" });

test.describe("ebd-frequency-report tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("ebd-frequency-report — relatório por período", async ({
    page,
    tutorialStep,
  }) => {
    const api = await ApiClient.asAdmin();
    const className = e2eClassName("TUTORIAL Rel EBD");
    const created = await api.createClass({ name: className });
    cleanup.classIds.push(created.id);

    const ebd = new EbdPage(page);
    const { from, to } = monthRangeIsoDate();

    await tutorialStep("Abrir relatório de frequência EBD", async () => {
      await ebd.gotoReports();
      await expect(page.getByTestId("class-frequency-report")).toBeVisible();
    });

    await tutorialStep("Filtrar por classe e período", async () => {
      await ebd.filterReport(created.id, from, to);
      await expect(page.getByTestId("class-frequency-report")).toBeVisible();
    });
  });
});
