import { test, expect } from '../../fixtures/tutorial.fixture';
import { SchedulesBoardPage } from '../../pages/secretariat.page';

test.describe.configure({ mode: 'serial' });

test('secretariat-schedules — quadro de escalas', async ({ page, tutorialStep }) => {
  const schedules = new SchedulesBoardPage(page);

  await tutorialStep('Abrir quadro de escalas', async () => {
    await schedules.goto();
    await expect(page.getByTestId('schedules-board')).toBeVisible();
  });

  await tutorialStep('Navegar para a semana atual', async () => {
    await schedules.goCurrentWeek();
    await expect(page.getByTestId('schedules-board')).toBeVisible();
  });
});
