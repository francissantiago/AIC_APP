import { test, expect } from "../../fixtures/tutorial.fixture";
import { ApiClient } from "../../helpers/api-client.helper";
import {
  createTutorialCleanupState,
  cleanupTutorialState,
} from "../../helpers/tutorial-cleanup.helper";
import {
  e2eMemberName,
  e2eMissionFieldName,
  todayIsoDate,
} from "../../helpers/test-data.helper";
import { MissionsPage } from "../../pages/missions.page";

test.describe.configure({ mode: "serial" });

test.describe("missions-assignments tutorial", () => {
  const cleanup = createTutorialCleanupState();
  const missionFieldIds: string[] = [];
  const missionAssignmentIds: string[] = [];

  test.afterAll(async () => {
    const api = await ApiClient.asAdmin();
    for (const id of missionAssignmentIds.splice(0)) {
      await api.deleteMissionAssignment(id).catch(() => undefined);
    }
    for (const id of missionFieldIds.splice(0)) {
      await api.deleteMissionField(id).catch(() => undefined);
    }
    await cleanupTutorialState(cleanup);
  });

  test("missions-assignments — vincular missionário ao campo", async ({
    page,
    tutorialStep,
  }) => {
    const api = await ApiClient.asAdmin();
    const memberName = e2eMemberName("TUTORIAL Missionário");
    const fieldName = e2eMissionFieldName("TUTORIAL Campo");
    const member = await api.createMember({
      fullName: memberName,
      status: "active",
    });
    cleanup.memberIds.push(member.id);
    const field = await api.createMissionField({
      name: fieldName,
      country: "Brasil",
      city: "São Paulo",
    });
    missionFieldIds.push(field.id);

    const missions = new MissionsPage(page);

    await tutorialStep("Abrir designações missionárias", async () => {
      await missions.gotoAssignments();
    });

    await tutorialStep("Criar designação de demonstração", async () => {
      await missions.openCreateAssignmentDialog();
      await missions.fillAssignmentForm({
        memberId: member.id,
        missionFieldId: field.id,
        startDate: todayIsoDate(),
      });
      await missions.saveAssignmentForm();
      await expect(page.getByRole("cell", { name: memberName })).toBeVisible();
    });
  });
});
