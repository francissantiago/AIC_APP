import type { Page } from "@playwright/test";

import { BasePage } from "./base.page";
import { waitForAppShell } from "../helpers/wait.helper";

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
    await waitForAppShell(this.page);
    await this.page.getByTestId("home-dashboard").waitFor({ state: "visible" });
    await this.page
      .getByText(/Carregando|Loading/i)
      .waitFor({ state: "hidden" })
      .catch(() => undefined);
  }
}
