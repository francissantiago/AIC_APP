import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { e2eMemberName } from "../../helpers/test-data.helper";
import { MembershipCardsPage } from "../../pages/membership-cards.page";

test.describe.configure({ mode: "serial" });

test.describe("membership-cards tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("membership-cards — gerar preview de carteirinha", async ({
    page,
    tutorialStep,
  }) => {
    const api = await ApiClient.asAdmin();
    const memberName = e2eMemberName("TUTORIAL Carteirinha");
    const member = await api.createMember({
      fullName: memberName,
      status: "active",
    });
    cleanup.memberIds.push(member.id);

    const cards = new MembershipCardsPage(page);

    await tutorialStep("Abrir emissão de carteirinhas", async () => {
      await cards.goto();
      await expect(page.getByTestId("membership-cards-page")).toBeVisible();
    });

    await tutorialStep("Selecionar membro e gerar preview", async () => {
      await cards.search(memberName);
      await cards.selectMemberByName(memberName);
      await cards.generatePreview();
      await expect(cards.preview()).toBeVisible();
    });
  });
});
