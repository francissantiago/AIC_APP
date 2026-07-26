import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { e2eMemberName } from '../../helpers/test-data.helper';
import { MembershipCardsPage } from '../../pages/membership-cards.page';

test.describe('Membership cards module', () => {
  const memberIds: string[] = [];

  test.afterEach(async () => {
    if (memberIds.length === 0) {
      return;
    }
    const api = await ApiClient.asAdmin();
    for (const id of memberIds.splice(0)) {
      await api.deleteMember(id).catch(() => undefined);
    }
  });

  test('MC-01 — buscar membro e gerar preview', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const fullName = e2eMemberName('MC01');
    const member = await api.createMember({ fullName, status: 'active' });
    memberIds.push(member.id);

    const cards = new MembershipCardsPage(page);
    await cards.goto();
    await cards.search(fullName);
    await cards.selectMemberByName(fullName);
    await cards.generatePreview();
    await expect(cards.preview()).toBeVisible();
  });
});
