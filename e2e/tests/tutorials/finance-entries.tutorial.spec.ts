import { test, expect } from '../../fixtures/tutorial.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import { waitForResourceId } from '../../helpers/demo-cleanup.helper';
import { createTutorialCleanupState, cleanupTutorialState } from '../../helpers/tutorial-cleanup.helper';
import { e2eFinanceEntryDescription, e2eMemberName } from '../../helpers/test-data.helper';
import { FinanceEntriesPage } from '../../pages/finance.page';

test.describe.configure({ mode: 'serial' });

test.describe('finance-entries tutorial', () => {
  const cleanup = createTutorialCleanupState();

  test.afterAll(async () => {
    await cleanupTutorialState(cleanup);
  });

  test('finance-entries — registrar dízimo', async ({ page, tutorialStep }) => {
    const api = await ApiClient.asAdmin();
    const memberName = e2eMemberName('TUTORIAL Dízimo');
    const member = await api.createMember({ fullName: memberName, status: 'active' });
    cleanup.memberIds.push(member.id);

    const description = e2eFinanceEntryDescription('TUTORIAL Dízimo');
    const entries = new FinanceEntriesPage(page);

    await tutorialStep('Abrir lançamentos financeiros', async () => {
      await entries.goto();
      await expect(page.getByTestId('finance-entries')).toBeVisible();
    });

    await tutorialStep('Registrar dízimo vinculado ao membro', async () => {
      await entries.openCreateDialog();
      await entries.fillEntryForm({
        type: 'income',
        categoryLabel: 'Dízimos',
        description,
        amount: '150.00',
        memberId: member.id,
        memberSearch: 'TUTORIAL Dízimo',
      });
      await entries.saveEntryForm();

      const entryId = await waitForResourceId(
        () => api.findFinancialEntryIdByDescription(description),
        'Lançamento tutorial',
      );
      cleanup.financialEntryIds.push(entryId);
      await expect(entries.row(entryId)).toBeVisible();
    });
  });
});
