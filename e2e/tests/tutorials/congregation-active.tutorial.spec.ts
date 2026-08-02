import { test, expect } from "../../fixtures/tutorial.fixture";
import { CongregationPage } from "../../pages/congregation.page";

test.describe.configure({ mode: "serial" });

test("congregation-active — dados da congregação sede", async ({
  page,
  tutorialStep,
}) => {
  const congregation = new CongregationPage(page);

  await tutorialStep("Abrir cadastro da congregação ativa", async () => {
    await congregation.gotoActive();
    await expect(page.getByTestId("congregation-active")).toBeVisible();
  });

  await tutorialStep("Visualizar formulário de edição", async () => {
    await congregation.openEditDialog();
    await expect(page.getByTestId("congregation-form")).toBeVisible();
  });
});
