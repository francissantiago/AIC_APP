import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import { waitForResourceId } from "../../helpers/demo-cleanup.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import { todayIsoDate } from "../../helpers/test-data.helper";
import { AttendancePage } from "../../pages/secretariat.page";

test.describe.configure({ mode: "serial" });

test.describe("secretariat-attendance tutorial", () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test("secretariat-attendance — registrar presença no culto", async ({
    page,
    tutorialStep,
  }) => {
    const eventDate = todayIsoDate();
    const attendance = new AttendancePage(page);

    await tutorialStep("Abrir registro de presença", async () => {
      await attendance.goto();
      await expect(page.getByTestId("attendance-list")).toBeVisible();
    });

    await tutorialStep("Lançar presença de demonstração", async () => {
      await attendance.openCreateDialog();
      await attendance.fillAttendanceForm({
        eventDate,
        eventType: "service",
        totalPresent: "120",
      });
      await attendance.saveAttendanceForm();

      const api = await ApiClient.asAdmin();
      const attendanceId = await waitForResourceId(
        () => api.findAttendanceIdByDate(eventDate),
        "Presença tutorial",
      );
      cleanup.attendanceIds.push(attendanceId);
      await expect(attendance.row(attendanceId)).toBeVisible();
    });
  });
});
