import { test, expect } from '../../fixtures/authenticated.fixture';
import { AppShellPage } from '../../pages/app-shell.page';

const topLevelRoutes = [
  { testId: 'nav-dashboard', path: '/dashboard' },
  { testId: 'nav-announcements', path: '/announcements' },
  { testId: 'nav-users', path: '/users' },
  { testId: 'nav-roles', path: '/roles' },
  { testId: 'nav-members', path: '/members' },
  { testId: 'nav-membership-cards', path: '/membership-cards' },
  { testId: 'nav-families', path: '/families' },
  { testId: 'nav-ministries', path: '/ministries' },
  { testId: 'nav-social-projects', path: '/social-projects' },
] as const;

const submenuGroups = [
  {
    toggle: 'nav-toggle-congregations',
    links: [
      { testId: 'nav-congregation', path: '/congregation' },
      { testId: 'nav-congregations', path: '/congregations' },
    ],
  },
  {
    toggle: 'nav-toggle-ebd',
    links: [
      { testId: 'nav-ebd', path: '/ebd' },
      { testId: 'nav-ebd-reports', path: '/ebd/reports' },
    ],
  },
  {
    toggle: 'nav-toggle-small-groups',
    links: [
      { testId: 'nav-small-groups', path: '/small-groups' },
      { testId: 'nav-small-groups-reports', path: '/small-groups/reports' },
    ],
  },
  {
    toggle: 'nav-toggle-missions',
    links: [
      { testId: 'nav-missions', path: '/missions' },
      { testId: 'nav-missions-fields', path: '/missions/fields' },
      { testId: 'nav-missions-booklets', path: '/missions/booklets' },
    ],
  },
  {
    toggle: 'nav-toggle-constructions',
    links: [
      { testId: 'nav-constructions', path: '/constructions' },
      { testId: 'nav-constructions-updates', path: '/constructions/updates' },
    ],
  },
  {
    toggle: 'nav-toggle-finance',
    links: [
      { testId: 'nav-finance', path: '/finance' },
      { testId: 'nav-finance-entries', path: '/finance/entries' },
      { testId: 'nav-finance-assets', path: '/finance/assets' },
      { testId: 'nav-finance-reports', path: '/finance/reports' },
    ],
  },
  {
    toggle: 'nav-toggle-secretariat',
    links: [
      { testId: 'nav-secretariat', path: '/secretariat' },
      { testId: 'nav-secretariat-agenda', path: '/secretariat/agenda' },
      { testId: 'nav-secretariat-visitors', path: '/secretariat/visitors' },
      { testId: 'nav-secretariat-attendance', path: '/secretariat/attendance' },
      { testId: 'nav-secretariat-documents', path: '/secretariat/documents' },
      { testId: 'nav-secretariat-schedules', path: '/secretariat/schedules' },
    ],
  },
] as const;

test.describe('Navigation smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const shell = new AppShellPage(page);
    await shell.expectLoaded();
  });

  for (const route of topLevelRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      const shell = new AppShellPage(page);
      await shell.navigateViaSidebar(route.testId);
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/\//g, '\\/')}$`));
      await expect(shell.mainContent).toBeVisible();
    });
  }

  test('loads /families/birthdays', async ({ page }) => {
    await page.goto('/families/birthdays');
    const shell = new AppShellPage(page);
    await shell.expectLoaded();
    await expect(page).toHaveURL(/\/families\/birthdays$/);
    await expect(page.getByTestId('family-birthdays-report')).toBeVisible();
  });

  for (const group of submenuGroups) {
    for (const link of group.links) {
      test(`loads ${link.path} via ${group.toggle}`, async ({ page }) => {
        const shell = new AppShellPage(page);
        await shell.expandSubmenu(group.toggle);
        await shell.navigateViaSidebar(link.testId);
        await expect(page).toHaveURL(new RegExp(`${link.path.replace(/\//g, '\\/')}$`));
        await expect(shell.mainContent).toBeVisible();
      });
    }
  }

  test('loads profile via header link', async ({ page }) => {
    await page.getByTestId('app-profile-link').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByTestId('app-main')).toBeVisible();
  });
});
