import type { IHelpVideo } from '@interfaces/IHelpVideo';
import { normalizeAppPath, resolveHelpVideoByUrl } from './help-video.util';

describe('help-video.util', () => {
  const videos: IHelpVideo[] = [
    {
      featureId: 'finance-dashboard',
      route: '/finance',
      path: '/help-videos/finance-dashboard.webm',
      titleKey: 'HELP_VIDEOS.FINANCE_DASHBOARD.TITLE',
    },
    {
      featureId: 'finance-entries',
      route: '/finance/entries',
      path: '/help-videos/finance-entries.webm',
      titleKey: 'HELP_VIDEOS.FINANCE_ENTRIES.TITLE',
    },
    {
      featureId: 'members-list',
      route: '/members',
      path: '/help-videos/members-list.webm',
      titleKey: 'HELP_VIDEOS.MEMBERS_LIST.TITLE',
    },
  ];

  it('normalizes query strings and trailing slashes', () => {
    expect(normalizeAppPath('/finance/entries?tab=1')).toBe('/finance/entries');
    expect(normalizeAppPath('/members/')).toBe('/members');
  });

  it('prefers the most specific route match', () => {
    expect(resolveHelpVideoByUrl('/finance/entries', videos)?.featureId).toBe('finance-entries');
    expect(resolveHelpVideoByUrl('/finance', videos)?.featureId).toBe('finance-dashboard');
  });

  it('matches nested paths under the same feature route', () => {
    expect(resolveHelpVideoByUrl('/members/abc/edit', videos)?.featureId).toBe('members-list');
  });
});
