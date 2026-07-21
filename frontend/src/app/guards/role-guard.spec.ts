import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserStatus } from '@enums/user-status';
import { IUser } from '@interfaces/IUser';
import { AuthService } from '@services/auth-service';
import {
  assetsPermissionGuard,
  defaultRouteGuard,
  financePermissionGuard,
  membersPermissionGuard,
  rolesPermissionGuard,
  secretariatPermissionGuard,
  usersPermissionGuard,
} from './role-guard';
import { getDefaultRouteForUser, hasAnyPermission } from '@utils/authorization';

function buildUser(permissions: string[]): IUser {
  return {
    id: '1',
    username: 'user',
    email: 'user@aic.org',
    fullName: 'User',
    status: UserStatus.ACTIVE,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    roles: [],
    permissions,
  };
}

describe('authorization utils', () => {
  it('getDefaultRouteForUser returns dashboard for any authenticated user', () => {
    expect(getDefaultRouteForUser(['members:read'])).toBe('/dashboard');
  });

  it('getDefaultRouteForUser returns dashboard even with no permissions', () => {
    expect(getDefaultRouteForUser([])).toBe('/dashboard');
  });

  it('hasAnyPermission uses OR semantics', () => {
    expect(hasAnyPermission(['finance:read', 'members:write'], ['finance:read'])).toBe(true);
  });
});

describe('permission guards', () => {
  let currentUser: ReturnType<typeof signal<IUser | null>>;
  let router: { parseUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    currentUser = signal<IUser | null>(null);
    router = { parseUrl: vi.fn((url: string) => `tree:${url}`) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('financePermissionGuard allows users with finance:read', () => {
    currentUser.set(buildUser(['finance:read']));
    const result = TestBed.runInInjectionContext(() =>
      financePermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('financePermissionGuard redirects users without finance:read', () => {
    currentUser.set(buildUser(['secretariat:read']));
    const result = TestBed.runInInjectionContext(() =>
      financePermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('tree:/dashboard');
  });

  it('usersPermissionGuard allows users with users:read', () => {
    currentUser.set(buildUser(['users:read']));
    const result = TestBed.runInInjectionContext(() =>
      usersPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('membersPermissionGuard redirects to default route when denied', () => {
    currentUser.set(buildUser(['finance:read']));
    const result = TestBed.runInInjectionContext(() =>
      membersPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('tree:/dashboard');
  });

  it('rolesPermissionGuard allows users with roles:read', () => {
    currentUser.set(buildUser(['roles:read']));
    const result = TestBed.runInInjectionContext(() =>
      rolesPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('secretariatPermissionGuard allows users with secretariat:read', () => {
    currentUser.set(buildUser(['secretariat:read']));
    const result = TestBed.runInInjectionContext(() =>
      secretariatPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('assetsPermissionGuard allows users with assets:read', () => {
    currentUser.set(buildUser(['assets:read']));
    const result = TestBed.runInInjectionContext(() =>
      assetsPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('assetsPermissionGuard redirects users with only finance:read', () => {
    currentUser.set(buildUser(['finance:read']));
    const result = TestBed.runInInjectionContext(() =>
      assetsPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('tree:/dashboard');
  });

  it('defaultRouteGuard redirects to dashboard for any authenticated user', () => {
    currentUser.set(buildUser(['members:read']));
    const result = TestBed.runInInjectionContext(() => defaultRouteGuard({} as never, {} as never));
    expect(result).toBe('tree:/dashboard');
  });

  it('redirects to no-access when there is no authenticated user', () => {
    const result = TestBed.runInInjectionContext(() =>
      financePermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('tree:/no-access');
  });
});
