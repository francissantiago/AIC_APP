import { test, expect } from '../../fixtures/authenticated.fixture';
import { ApiClient } from '../../helpers/api-client.helper';
import {
  currentYearCalendarRange,
  e2eMemberName,
  e2eSuffix,
  todayBirthDateIso,
} from '../../helpers/test-data.helper';
import { MembersPage } from '../../pages/members.page';

async function waitForBirthdayEvent(
  api: ApiClient,
  memberId: string,
  range: { from: string; to: string },
): Promise<boolean> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const event = await api.findBirthdayEventForMember(memberId, range.from, range.to);
    if (event) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

test.describe('Members module', () => {
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

  test('MEM-01 — listagem com busca e filtro de status', async ({ page }) => {
    const fullName = e2eMemberName('MEM01');
    const api = await ApiClient.asAdmin();
    const created = await api.createMember({ fullName, status: 'active' });
    memberIds.push(created.id);

    const members = new MembersPage(page);
    await members.goto();
    await members.expectListReady();
    await members.search(fullName);
    await expect(members.row(created.id)).toBeVisible();

    await members.filterStatus('active');
    await expect(members.row(created.id)).toBeVisible();
  });

  test('MEM-02 — criar membro com data de nascimento', async ({ page }) => {
    const fullName = e2eMemberName('MEM02');
    const birthDate = todayBirthDateIso(1992);

    const members = new MembersPage(page);
    await members.goto();
    await members.openCreateDialog();
    await members.fillCreateForm({ fullName, birthDate, status: 'active' });
    await members.saveForm();

    const api = await ApiClient.asAdmin();
    const memberId = (await api.findMemberIdByFullName(fullName)) ?? '';
    expect(memberId).toBeTruthy();
    memberIds.push(memberId);

    await members.search(fullName);
    await expect(members.row(memberId)).toBeVisible();
  });

  test('MEM-03 — editar membro', async ({ page }) => {
    const fullName = e2eMemberName('MEM03');
    const api = await ApiClient.asAdmin();
    const created = await api.createMember({ fullName, status: 'active' });
    memberIds.push(created.id);

    const members = new MembersPage(page);
    await members.goto();
    await members.search(fullName);
    await members.openEdit(created.id);
    await page.getByTestId('member-form-full-name').fill(`${fullName} Editado`);
    await members.saveForm();

    await members.search(`${fullName} Editado`);
    await expect(members.row(created.id)).toBeVisible();
  });

  test('MEM-04 — inativar membro', async ({ page }) => {
    const fullName = e2eMemberName('MEM04');
    const api = await ApiClient.asAdmin();
    const created = await api.createMember({ fullName, status: 'active' });
    memberIds.push(created.id);

    const members = new MembersPage(page);
    await members.goto();
    await members.search(fullName);
    await members.openEdit(created.id);
    await members.setStatus('inactive');
    await members.saveForm();

    await members.filterStatus('inactive');
    await expect(members.row(created.id)).toBeVisible();
  });

  test('MEM-05 — excluir membro com confirmação', async ({ page }) => {
    const fullName = e2eMemberName('MEM05');
    const api = await ApiClient.asAdmin();
    const created = await api.createMember({ fullName, status: 'active' });

    const members = new MembersPage(page);
    await members.goto();
    await members.search(fullName);
    await members.deleteMember(created.id);

    await expect(members.row(created.id)).toHaveCount(0);
  });

  test('MEM-06 — paginação next/prev', async ({ page }) => {
    const batch = e2eSuffix();
    const api = await ApiClient.asAdmin();
    for (let index = 0; index < 21; index += 1) {
      const created = await api.createMember({
        fullName: `E2E Pag ${batch} ${String(index).padStart(2, '0')}`,
        status: 'active',
      });
      memberIds.push(created.id);
    }

    const members = new MembersPage(page);
    await members.goto();
    await members.search(`E2E Pag ${batch}`);
    await expect(page.getByTestId('member-pagination')).toBeVisible();
    await expect(page.getByTestId('member-page-next')).toBeEnabled();
    await members.nextPage();
    await expect(page.getByTestId('member-page-indicator')).toContainText('2');
    await members.previousPage();
    await expect(page.getByTestId('member-page-indicator')).toContainText('1');
  });

  test('MEM-07 — wizard de transferência até preview', async ({ page }) => {
    const fullName = e2eMemberName('MEM07');
    const api = await ApiClient.asAdmin();
    const created = await api.createMember({ fullName, status: 'active' });
    memberIds.push(created.id);

    const members = new MembersPage(page);
    await members.goto();
    await members.search(fullName);
    await members.openEdit(created.id);
    await members.goToTransfersTab();
    await members.startTransferWizard();
    await members.fillTransferDestination('Igreja Destino E2E', 'São Paulo');
    await members.transferGoToPreview();

    await expect(page.getByTestId('transfer-letter-preview')).toContainText(fullName);
  });

  test('MEM-08 — evento de aniversário na agenda após create', async ({ page }) => {
    const fullName = e2eMemberName('MEM08');
    const birthDate = todayBirthDateIso(1988);
    const range = currentYearCalendarRange();

    const members = new MembersPage(page);
    await members.goto();
    await members.openCreateDialog();
    await members.fillCreateForm({ fullName, birthDate, status: 'active' });
    await members.saveForm();

    const api = await ApiClient.asAdmin();
    const memberId = (await api.findMemberIdByFullName(fullName)) ?? '';
    expect(memberId).toBeTruthy();
    memberIds.push(memberId);

    const hasBirthdayEvent = await waitForBirthdayEvent(api, memberId, range);
    expect(hasBirthdayEvent).toBe(true);

    const event = await api.findBirthdayEventForMember(memberId, range.from, range.to);
    expect(event?.title).toBe(`Aniversário: ${fullName}`);
    expect(event?.type).toBe('birthday');
  });
});
