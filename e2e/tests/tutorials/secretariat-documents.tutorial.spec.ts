import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eDocumentTitle, todayIsoDate } from "../../helpers/test-data.helper";
import { DocumentsPage } from "../../pages/secretariat.page";

test.describe.configure({ mode: "serial" });

test.describe("secretariat-documents tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("secretariat-documents — cadastrar documento", async ({
    page,
    tutorialStep,
  }) => {
    const documentTitle = e2eDocumentTitle("TUTORIAL Documento");
    const documents = new DocumentsPage(page);

    await tutorialStep("Abrir gestão de documentos", async () => {
      await documents.goto();
      await expect(page.getByTestId("documents-list")).toBeVisible();
    });

    await tutorialStep("Cadastrar documento e anexar PDF", async () => {
      await documents.openCreateDialog();
      await documents.fillDocumentForm({
        title: documentTitle,
        documentDate: todayIsoDate(),
      });
      await documents.saveDocumentForm("create");
      await documents.uploadPdfInForm();

      const api = await ApiClient.asAdmin();
      const documentId = await waitForResourceId(
        () => api.findDocumentIdByTitle(documentTitle),
        "Documento tutorial",
      );
      cleanup.documentIds.push(documentId);
      await expect(documents.row(documentId)).toBeVisible();
    });
  });
});
