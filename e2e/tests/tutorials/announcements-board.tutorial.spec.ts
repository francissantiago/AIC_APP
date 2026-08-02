import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eAnnouncementTitle } from "../../helpers/test-data.helper";
import { AnnouncementsPage } from "../../pages/announcements.page";

test.describe.configure({ mode: "serial" });

test.describe("announcements-board tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("announcements-board — mural e novo aviso", async ({
    page,
    tutorialStep,
  }) => {
    const title = e2eAnnouncementTitle("TUTORIAL Aviso");
    const announcements = new AnnouncementsPage(page);

    await tutorialStep("Abrir mural de avisos", async () => {
      await announcements.goto();
      await announcements.expectBoardReady();
    });

    await tutorialStep("Publicar aviso de demonstração", async () => {
      await announcements.openCreateDialog();
      await announcements.fillForm(
        title,
        "Tutorial E2E — aviso publicado para a congregação.",
      );
      await announcements.saveForm();
      await expect(announcements.board()).toContainText(title);

      const api = await ApiClient.asAdmin();
      const announcementId = await waitForResourceId(
        () => api.findAnnouncementIdByTitle(title),
        "Aviso tutorial",
      );
      cleanup.announcementIds.push(announcementId);
    });
  });
});
