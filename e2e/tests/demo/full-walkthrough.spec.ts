import { test, expect } from "@playwright/test";

import {
  cleanupDemoState,
  createDemoCleanupState,
  waitForResourceId,
} from "../../helpers/demo-cleanup.helper";
import { ApiClient } from "../../helpers/api-client.helper";
import {
  currentYearCalendarRange,
  e2eCalendarEventTitle,
  eventInCurrentWeek,
  localDateTimeInput,
  monthRangeIsoDate,
} from "../../helpers/test-data.helper";
import { prepareTutorialPage } from "../../helpers/tutorial-visual.helper";
import { AppShellPage } from "../../pages/app-shell.page";
import { FinanceDashboardPage } from "../../pages/finance.page";
import { LoginPage } from "../../pages/login.page";
import {
  AgendaCalendarPage,
  SecretariatDashboardPage,
} from "../../pages/secretariat.page";
import { SocialProjectsPage } from "../../pages/social-projects.page";

const DEMO_TIMELINE_MS = {
  introduction: 15_000,
  secretariatAndAgenda: 40_000,
  financeAndProjects: 65_000,
  supportAndAccessibility: 80_000,
  closing: 90_000,
} as const;

async function holdUntilTimeline(
  page: Parameters<typeof prepareTutorialPage>[0],
  startedAt: number,
  targetElapsedMs: number,
): Promise<void> {
  const remainingMs = targetElapsedMs - (Date.now() - startedAt);
  if (remainingMs > 0) {
    await page.waitForTimeout(remainingMs);
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Demo walkthrough", () => {
  test.setTimeout(3_600_000);

  const cleanup = createDemoCleanupState();

  test.afterAll(async () => {
    await cleanupDemoState(cleanup);
  });

  test("roteiro comercial completo — 5 capítulos", async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? "admin@admin.com";
    const password = process.env.E2E_ADMIN_PASSWORD ?? "";
    test.skip(!password, "E2E_ADMIN_PASSWORD não configurado");

    await prepareTutorialPage(page);
    const startedAt = Date.now();
    const shell = new AppShellPage(page);

    await test.step("Capítulo 1 — Introdução: O Problema e a Solução", async () => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await expect(page.getByTestId("language-switcher")).toBeVisible();
      await loginPage.login(email, password);
      await expect(page).not.toHaveURL(/\/login$/);

      await shell.expectLoaded();
      await expect(page.getByTestId("notifications-bell")).toBeVisible();
      await expect(page.getByTestId("app-sidebar-nav")).toBeVisible();
      await holdUntilTimeline(page, startedAt, DEMO_TIMELINE_MS.introduction);
    });

    const eventTitle = e2eCalendarEventTitle("DEMO Evento Promocional");

    await test.step("Capítulo 2 — Módulo de Destaque: Secretaria e Agenda", async () => {
      const secretariat = new SecretariatDashboardPage(page);
      await secretariat.goto();
      await expect(
        page.getByTestId("secretariat-dashboard-cards"),
      ).toBeVisible();

      const { startsAt, endsAt } = eventInCurrentWeek();
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      const agenda = new AgendaCalendarPage(page);
      await agenda.goto();
      await agenda.openCreateDialog();
      await agenda.fillEventForm({
        title: eventTitle,
        startsAt: localDateTimeInput(start),
        endsAt: localDateTimeInput(end),
      });
      await agenda.saveEventForm();
      await agenda.switchToDayView();

      const api = await ApiClient.asAdmin();
      const range = currentYearCalendarRange();
      const eventId = await waitForResourceId(
        () => api.findCalendarEventIdByTitle(eventTitle, range.from, range.to),
        "Evento agenda demo",
      );
      cleanup.calendarEventIds.push(eventId);
      await holdUntilTimeline(
        page,
        startedAt,
        DEMO_TIMELINE_MS.secretariatAndAgenda,
      );
    });

    await test.step("Capítulo 3 — Módulo de Destaque: Gestão Financeira e Projetos", async () => {
      const { from, to } = monthRangeIsoDate();
      const dashboard = new FinanceDashboardPage(page);
      await dashboard.goto();
      await dashboard.filterPeriod(from, to);
      await expect(page.getByTestId("finance-dashboard-cards")).toBeVisible();
      await expect(page.getByTestId("finance-monthly-chart")).toBeVisible();

      // Transição para Projetos Sociais
      const socialProjects = new SocialProjectsPage(page);
      await socialProjects.goto();
      await expect(
        page
          .getByTestId("social-project-create-btn")
          .or(page.getByTestId("social-project-table"))
          .first(),
      ).toBeVisible();
      await holdUntilTimeline(
        page,
        startedAt,
        DEMO_TIMELINE_MS.financeAndProjects,
      );
    });

    await test.step("Capítulo 4 — Módulo de Suporte e Acessibilidade", async () => {
      // Demonstrando o PWA e troca de idioma (Inglês, Espanhol, de volta para Pt)
      await expect(page.getByTestId("language-switcher")).toBeVisible();
      await page.getByTestId("language-switcher").selectOption("en");

      await page.waitForTimeout(500); // pequeno timeout para evidenciar a troca visual

      await page.getByTestId("language-switcher").selectOption("es");

      await page.waitForTimeout(500);

      await page.getByTestId("language-switcher").selectOption("pt-BR");

      // Abrir o vídeo de ajuda/tutorial
      const helpButton = page.getByTestId("help-video-trigger").first();
      await expect(helpButton).toBeVisible();
      await helpButton.click();

      const helpDialog = page.getByTestId("help-video-dialog");
      await expect(helpDialog).toBeVisible();

      // Fecha o vídeo
      await page.keyboard.press("Escape");
      await expect(helpDialog).not.toBeVisible();
      await holdUntilTimeline(
        page,
        startedAt,
        DEMO_TIMELINE_MS.supportAndAccessibility,
      );
    });

    await test.step("Capítulo 5 — Encerramento e Chamada para Ação", async () => {
      await shell.logout();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByTestId("login-form")).toBeVisible();
      // O logotipo (texto) em destaque
      await expect(page.getByText("AIC").first()).toBeVisible();
      await holdUntilTimeline(page, startedAt, DEMO_TIMELINE_MS.closing);
    });
  });
});
