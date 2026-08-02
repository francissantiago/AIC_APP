import type { Page } from "@playwright/test";

import { BasePage } from "./base.page";
import { waitForAppShell, waitForSearchResponse } from "../helpers/wait.helper";

export class ConstructionsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoProjects(): Promise<void> {
    await this.page.goto("/constructions");
    await waitForAppShell(this.page);
    await this.page
      .getByTestId("construction-project-create-btn")
      .or(this.page.getByRole("heading").first())
      .first()
      .waitFor({ state: "visible" });
  }

  async gotoUpdates(): Promise<void> {
    await this.page.goto("/constructions/updates");
    await waitForAppShell(this.page);
  }

  async openCreateProjectDialog(): Promise<void> {
    await this.page.getByTestId("construction-project-create-btn").click();
    await this.page
      .getByTestId("construction-project-form")
      .waitFor({ state: "visible" });
  }

  async fillProjectForm(options: {
    name: string;
    supervisorMemberId?: string;
  }): Promise<void> {
    const form = this.page.getByTestId("construction-project-form");
    await form.locator('[formcontrolname="name"]').fill(options.name);
    if (options.supervisorMemberId) {
      await form
        .locator('[formcontrolname="supervisorMemberId"]')
        .selectOption(options.supervisorMemberId);
    }
  }

  async saveProjectForm(): Promise<void> {
    const form = this.page.getByTestId("construction-project-form");
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/construction-projects") &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    await form.getByRole("button", { name: /Salvar|Save|Guardar/i }).click();
    await saveResponse;
    const dialog = this.page.locator('dialog[open][data-testid="app-dialog"]');
    await dialog.locator("header button").click();
    await dialog.waitFor({ state: "hidden" });
  }

  async search(query: string): Promise<void> {
    await this.page.locator('[formcontrolname="q"]').fill(query);
    await waitForSearchResponse(this.page);
  }

  row(projectId: string) {
    return this.page.getByTestId(`construction-project-row-${projectId}`);
  }
}
