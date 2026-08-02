import { test, expect } from "../../fixtures/tutorial.fixture";
import { FamiliesPage } from "../../pages/families.page";

test.describe.configure({ mode: "serial" });

test("families-birthdays — relatório de aniversários", async ({
  page,
  tutorialStep,
}) => {
  const families = new FamiliesPage(page);

  await tutorialStep("Abrir relatório de aniversários", async () => {
    await families.gotoBirthdaysReport();
    await expect(page.getByTestId("family-birthdays-report")).toBeVisible();
  });

  await tutorialStep("Filtrar por mês atual", async () => {
    await families.filterBirthdaysByMonth(new Date().getMonth() + 1);
    await expect(page.getByTestId("family-birthdays-report")).toBeVisible();
  });
});
