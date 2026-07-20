import { test, expect } from '../../fixtures/authenticated.fixture';
import { AnnouncementsPage } from '../../pages/announcements.page';

test.describe('Announcements smoke', () => {
  test('ANN-01 smoke — página carrega e board visível', async ({ page }) => {
    const announcements = new AnnouncementsPage(page);
    await announcements.goto();
    await announcements.expectBoardReady();
    await expect(announcements.board()).toBeVisible();
  });
});
