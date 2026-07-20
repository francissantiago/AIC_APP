import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client.helper';
import { loginViaApi } from '../../helpers/api-auth.helper';
import { e2eEmail, e2eUsername } from '../../helpers/test-data.helper';
import { getApiUrl, injectSessionToken } from '../../helpers/session.helper';
import { waitForAppShell } from '../../helpers/wait.helper';

test.describe('Permissions ACL', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const password = 'E2ePass123!';
  let leaderUsername = '';
  let leaderUserId = '';
  let memberUsername = '';
  let memberUserId = '';
  let leaderToken = '';
  let memberToken = '';

  test.beforeAll(async () => {
    const api = await ApiClient.asAdmin();
    const leaderRoleId = await api.findRoleIdByCode('LEADER');
    const memberRoleId = await api.findRoleIdByCode('MEMBER');

    leaderUsername = e2eUsername('acl-leader');
    memberUsername = e2eUsername('acl-member');

    const leader = await api.createUser({
      username: leaderUsername,
      email: e2eEmail(leaderUsername),
      fullName: 'ACL Leader E2E',
      password,
      status: 'active',
      roleIds: [leaderRoleId],
    });
    leaderUserId = leader.id;

    const member = await api.createUser({
      username: memberUsername,
      email: e2eEmail(memberUsername),
      fullName: 'ACL Member E2E',
      password,
      status: 'active',
      roleIds: [memberRoleId],
    });
    memberUserId = member.id;

    leaderToken = (await loginViaApi(getApiUrl(), leader.email, password)).accessToken;
    memberToken = (await loginViaApi(getApiUrl(), member.email, password)).accessToken;
  });

  test.afterAll(async () => {
    const api = await ApiClient.asAdmin();
    if (leaderUserId) {
      await api.deleteUser(leaderUserId).catch(() => undefined);
    }
    if (memberUserId) {
      await api.deleteUser(memberUserId).catch(() => undefined);
    }
  });

  test('ACL-01 — LEADER vê governança e não vê finanças na sidebar', async ({ page }) => {
    await injectSessionToken(page, leaderToken);
    await page.goto('/users');
    await waitForAppShell(page);

    await expect(page.getByTestId('nav-members')).toBeVisible();
    await expect(page.getByTestId('nav-users')).toBeVisible();
    await expect(page.getByTestId('nav-roles')).toBeVisible();
    await expect(page.getByTestId('nav-toggle-finance')).toHaveCount(0);
  });

  test('ACL-02 — LEADER não vê botão criar em membros', async ({ page }) => {
    await injectSessionToken(page, leaderToken);
    await page.goto('/members');
    await waitForAppShell(page);

    await expect(page.getByTestId('member-create-btn')).toHaveCount(0);
  });

  test('ACL-03 — MEMBER é redirecionado ao acessar finanças', async ({ page }) => {
    await injectSessionToken(page, memberToken);
    await page.goto('/finance');
    await waitForAppShell(page);

    await expect(page).not.toHaveURL(/\/finance$/);
    await expect(page).toHaveURL(/\/announcements/);
  });

  test('ACL-04 — deep link /finance sem permissão redireciona fallback', async ({ page }) => {
    await injectSessionToken(page, leaderToken);
    await page.goto('/finance/entries');
    await waitForAppShell(page);

    await expect(page).not.toHaveURL(/\/finance/);
    await expect(page).toHaveURL(/\/announcements/);
  });

  test('USR-05 — LEADER read-only em usuários', async ({ page }) => {
    await injectSessionToken(page, leaderToken);
    await page.goto('/users');
    await waitForAppShell(page);

    await expect(page.getByTestId('user-create-btn')).toHaveCount(0);
  });

  test('ROL-05 — LEADER read-only em papéis', async ({ page }) => {
    await injectSessionToken(page, leaderToken);
    await page.goto('/roles');
    await waitForAppShell(page);

    await expect(page.getByTestId('role-create-btn')).toHaveCount(0);
  });

  test('CON-06 — LEADER sem manage_branches não vê botão criar filial', async ({ page }) => {
    await injectSessionToken(page, leaderToken);
    await page.goto('/congregations');
    await waitForAppShell(page);

    await expect(page.getByTestId('congregation-create-btn')).toHaveCount(0);
  });

  test('FIN-07 — PASTOR read-only em finanças sem botão criar lançamento', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const pastorRoleId = await api.findRoleIdByCode('PASTOR');
    const pastorUsername = e2eUsername('acl-pastor');
    let pastorUserId = '';
    let pastorToken = '';

    try {
      const pastor = await api.createUser({
        username: pastorUsername,
        email: e2eEmail(pastorUsername),
        fullName: 'ACL Pastor E2E',
        password,
        status: 'active',
        roleIds: [pastorRoleId],
      });
      pastorUserId = pastor.id;
      pastorToken = (await loginViaApi(getApiUrl(), pastor.email, password)).accessToken;

      await injectSessionToken(page, pastorToken);
      await page.goto('/finance/entries');
      await waitForAppShell(page);

      await expect(page.getByTestId('finance-entry-create-btn')).toHaveCount(0);
      await expect(page.getByTestId('finance-categories-btn')).toHaveCount(0);
    } finally {
      if (pastorUserId) {
        await api.deleteUser(pastorUserId).catch(() => undefined);
      }
    }
  });

  test('SEC-09 — PASTOR read-only na secretaria sem botões de escrita', async ({ page }) => {
    const api = await ApiClient.asAdmin();
    const pastorRoleId = await api.findRoleIdByCode('PASTOR');
    const pastorUsername = e2eUsername('acl-pastor-sec');
    let pastorUserId = '';
    let pastorToken = '';

    try {
      const pastor = await api.createUser({
        username: pastorUsername,
        email: e2eEmail(pastorUsername),
        fullName: 'ACL Pastor Secretaria E2E',
        password,
        status: 'active',
        roleIds: [pastorRoleId],
      });
      pastorUserId = pastor.id;
      pastorToken = (await loginViaApi(getApiUrl(), pastor.email, password)).accessToken;

      await injectSessionToken(page, pastorToken);

      await page.goto('/secretariat/visitors');
      await waitForAppShell(page);
      await expect(page.getByTestId('visitor-create-btn')).toHaveCount(0);

      await page.goto('/secretariat/agenda');
      await waitForAppShell(page);
      await expect(page.getByTestId('agenda-create-btn')).toHaveCount(0);

      await page.goto('/secretariat/schedules');
      await waitForAppShell(page);
      await expect(page.getByTestId('schedules-editor-open-btn')).toHaveCount(0);
    } finally {
      if (pastorUserId) {
        await api.deleteUser(pastorUserId).catch(() => undefined);
      }
    }
  });
});
