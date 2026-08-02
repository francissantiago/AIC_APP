import { test, expect } from "../../fixtures/tutorial.fixture";
import { FinanceDashboardPage } from "../../pages/finance.page";
import { monthRangeIsoDate } from "../../helpers/test-data.helper";

test.describe.configure({ mode: "serial" });

test("finance-dashboard — indicadores financeiros", async ({
  page,
  tutorialStep,
}) => {
  const { from, to } = monthRangeIsoDate();
  const dashboard = new FinanceDashboardPage(page);

  await tutorialStep("Abrir dashboard financeiro", async () => {
    await dashboard.goto();
    await expect(page.getByTestId("finance-dashboard-cards")).toBeVisible();
  });

  await tutorialStep("Filtrar período e visualizar gráficos", async () => {
    await dashboard.filterPeriod(from, to);
    await expect(page.getByTestId("finance-monthly-chart")).toBeVisible();
  });
});
