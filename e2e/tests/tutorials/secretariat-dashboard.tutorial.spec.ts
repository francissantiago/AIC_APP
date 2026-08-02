import { test, expect } from "../../fixtures/tutorial.fixture";
import { SecretariatDashboardPage } from "../../pages/secretariat.page";

test.describe.configure({ mode: "serial" });

test("secretariat-dashboard — visão geral da secretaria", async ({
  page,
  tutorialStep,
}) => {
  const secretariat = new SecretariatDashboardPage(page);

  await tutorialStep("Abrir painel da secretaria", async () => {
    await secretariat.goto();
    await expect(page.getByTestId("secretariat-dashboard-cards")).toBeVisible();
  });

  await tutorialStep("Explorar indicadores e atalhos", async () => {
    await expect(page.getByTestId("secretariat-dashboard")).toBeVisible();
  });
});
