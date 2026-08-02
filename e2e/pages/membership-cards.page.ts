import type { Page } from "@playwright/test";

import { BasePage } from "./base.page";
import { waitForAppShell } from "../helpers/wait.helper";

export class MembershipCardsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto("/membership-cards");
    await waitForAppShell(this.page);
    await this.page
      .getByTestId("membership-cards-page")
      .waitFor({ state: "visible" });
    await this.page
      .getByText(/Carregando|Loading/i)
      .waitFor({ state: "hidden" })
      .catch(() => undefined);
  }

  async search(query: string): Promise<void> {
    await this.page.locator('[type="search"]').first().fill(query);
    await this.page
      .getByRole("listbox")
      .getByRole("option", { name: query })
      .waitFor({ state: "visible" });
  }

  async selectMemberByName(fullName: string): Promise<void> {
    await this.page
      .getByRole("listbox")
      .getByRole("option", { name: fullName })
      .click();
  }

  async generatePreview(): Promise<void> {
    await this.page
      .getByRole("button", { name: /Gerar|Generate|Generar/i })
      .first()
      .click();
  }

  preview() {
    return this.page.locator("app-membership-card-preview");
  }
}
