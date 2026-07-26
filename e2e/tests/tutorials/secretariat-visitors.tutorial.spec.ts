import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import { e2eVisitorName, todayIsoDate } from '../../helpers/test-data.helper';
import { VisitorsPage } from '../../pages/secretariat.page';

test.describe.configure({ mode: 'serial' });

test.describe('secretariat-visitors tutorial', () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test('secretariat-visitors — cadastrar visitante', async ({ page, tutorialStep }) => {
    const visitorName = e2eVisitorName('TUTORIAL Visitante');
    const visitors = new VisitorsPage(page);

    await tutorialStep('Abrir lista de visitantes', async () => {
      await visitors.goto();
      await expect(page.getByTestId('visitors-list')).toBeVisible();
    });

    await tutorialStep('Registrar visitante de demonstração', async () => {
      await visitors.openCreateDialog();
      await visitors.fillVisitorForm({ fullName: visitorName, visitDate: todayIsoDate() });
      await visitors.saveVisitorForm();

      const api = await ApiClient.asAdmin();
      const visitorId = await waitForResourceId(
        () => api.findVisitorIdByFullName(visitorName),
        'Visitante tutorial',
      );
      cleanup.visitorIds.push(visitorId);
      await expect(visitors.row(visitorId)).toBeVisible();
    });
  });
});
