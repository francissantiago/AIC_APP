import { getDefaultRouteForUser, hasAnyPermission, hasPermission } from './authorization';

describe('authorization', () => {
  it('hasPermission checks exact code', () => {
    expect(hasPermission(['users:read'], 'users:read')).toBe(true);
    expect(hasPermission(['users:read'], 'users:write')).toBe(false);
  });

  it('hasAnyPermission returns true when there is an intersection', () => {
    expect(hasAnyPermission(['finance:read', 'members:write'], ['finance:read'])).toBe(true);
  });

  it('hasAnyPermission returns false without intersection', () => {
    expect(hasAnyPermission(['members:read'], ['finance:read', 'finance:write'])).toBe(false);
  });

  it('getDefaultRouteForUser returns dashboard for any authenticated user', () => {
    expect(getDefaultRouteForUser(['announcements:read', 'users:read', 'members:read'])).toBe(
      '/dashboard',
    );
  });

  it('getDefaultRouteForUser returns dashboard even with no permissions', () => {
    expect(getDefaultRouteForUser([])).toBe('/dashboard');
  });

  it('getDefaultRouteForUser returns dashboard for assets-only users', () => {
    expect(getDefaultRouteForUser(['assets:read'])).toBe('/dashboard');
  });
});
