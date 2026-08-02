import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eMemberName } from "../../helpers/test-data.helper";
import { MembersPage } from "../../pages/members.page";

test.describe.configure({ mode: "serial" });

test.describe("members-list tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("members-list — cadastrar e localizar membro", async ({
    page,
    tutorialStep,
  }) => {
    const fullName = e2eMemberName("TUTORIAL Membro");
    const members = new MembersPage(page);

    await tutorialStep("Abrir lista de membros", async () => {
      await members.goto();
      await members.expectListReady();
    });

    await tutorialStep("Cadastrar membro de demonstração", async () => {
      await members.openCreateDialog();
      await members.fillCreateForm({ fullName, status: "active" });
      await members.saveForm();
      await members.search(fullName);

      const api = await ApiClient.asAdmin();
      const memberId = await waitForResourceId(
        () => api.findMemberIdByFullName(fullName),
        "Membro tutorial",
      );
      cleanup.memberIds.push(memberId);
      await expect(members.row(memberId)).toBeVisible();
    });
  });
});
