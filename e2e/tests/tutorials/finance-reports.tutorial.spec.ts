import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import {
  e2eFinanceEntryDescription,
  monthRangeIsoDate,
  todayIsoDate,
} from "../../helpers/test-data.helper";
import { FinanceReportsPage } from "../../pages/finance.page";

test.describe.configure({ mode: "serial" });

test.describe("finance-reports tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("finance-reports — relatório de caixa", async ({
    page,
    tutorialStep,
  }) => {
    const api = await ApiClient.asAdmin();
    const description = e2eFinanceEntryDescription("TUTORIAL Relatório");
    const category = await api.findIncomeCategoryByName("Dízimos");
    expect(category).toBeTruthy();
    if (!category) {
      return;
    }

    const entry = await api.createFinancialEntry({
      entryDate: todayIsoDate(),
      type: "income",
      categoryId: category.id,
      description,
      amount: 75,
    });
    cleanup.financialEntryIds.push(entry.id);

    const { from, to } = monthRangeIsoDate();
    const reports = new FinanceReportsPage(page);

    await tutorialStep("Abrir relatórios financeiros", async () => {
      await reports.goto();
      await expect(page.getByTestId("finance-reports")).toBeVisible();
    });

    await tutorialStep("Gerar relatório de caixa por período", async () => {
      await reports.selectCashTab();
      await reports.applyCashPeriod(from, to);
      await expect(
        page.getByTestId("finance-reports-cash-table"),
      ).toContainText(description);
    });
  });
});
