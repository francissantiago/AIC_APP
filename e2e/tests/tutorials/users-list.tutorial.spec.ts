import { test, expect } from "../../fixtures/tutorial.fixture";
import { UsersPage } from "../../pages/users.page";

test.describe.configure({ mode: "serial" });

test("users-list — buscar usuário admin", async ({ page, tutorialStep }) => {
  const users = new UsersPage(page);
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@admin.com";

  await tutorialStep("Abrir gestão de usuários", async () => {
    await users.goto();
    await expect(page.getByTestId("user-table")).toBeVisible();
  });

  await tutorialStep("Localizar usuário administrador", async () => {
    await users.search(adminEmail);
    await expect(
      page.getByTestId("user-table").getByText(adminEmail),
    ).toBeVisible();
  });
});
