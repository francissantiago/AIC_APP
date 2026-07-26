import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import {
  currentYearCalendarRange,
  e2eCalendarEventTitle,
  eventInCurrentWeek,
  localDateTimeInput,
} from '../../helpers/test-data.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { AgendaCalendarPage } from '../../pages/secretariat.page';

test.describe.configure({ mode: 'serial' });

test.describe('secretariat-agenda tutorial', () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test('secretariat-agenda — criar evento na agenda', async ({ page, tutorialStep }) => {
    const title = e2eCalendarEventTitle('TUTORIAL Evento');
    const { startsAt, endsAt } = eventInCurrentWeek();
    const agenda = new AgendaCalendarPage(page);

    await tutorialStep('Abrir agenda da secretaria', async () => {
      await agenda.goto();
      await expect(page.getByTestId('agenda-calendar')).toBeVisible();
    });

    await tutorialStep('Cadastrar evento de demonstração', async () => {
      await agenda.openCreateDialog();
      await agenda.fillEventForm({
        title,
        startsAt: localDateTimeInput(new Date(startsAt)),
        endsAt: localDateTimeInput(new Date(endsAt)),
      });
      await agenda.saveEventForm();
      await agenda.switchToDayView();

      const api = await ApiClient.asAdmin();
      const range = currentYearCalendarRange();
      const eventId = await waitForResourceId(
        () => api.findCalendarEventIdByTitle(title, range.from, range.to),
        'Evento tutorial',
      );
      cleanup.calendarEventIds.push(eventId);
    });
  });
});
