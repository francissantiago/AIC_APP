import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserStatus } from '@enums/user-status';
import { IUser } from '@interfaces/IUser';
import { AuthService } from '@services/auth-service';
import {
  assetsPermissionGuard,
  financePermissionGuard,
  hasAnyPermission,
  secretariatPermissionGuard,
} from './role-guard';

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

describe('hasAnyPermission', () => {
  it('returns true when there is an intersection', () => {
    expect(hasAnyPermission(['finance:read', 'members:write'], ['finance:read'])).toBe(true);
  });

  it('returns false without intersection', () => {
    expect(hasAnyPermission(['members:read'], ['finance:read', 'finance:write'])).toBe(false);
  });

  it('returns false for an empty permission list', () => {
    expect(hasAnyPermission([], ['finance:read'])).toBe(false);
  });
});

describe('permission guards', () => {
  let currentUser: ReturnType<typeof signal<IUser | null>>;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    currentUser = signal<IUser | null>(null);
    router = { createUrlTree: vi.fn().mockReturnValue('redirect-tree') };

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
    expect(result).toBe('redirect-tree');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/users']);
  });

  it('secretariatPermissionGuard allows users with secretariat:read', () => {
    currentUser.set(buildUser(['secretariat:read']));
    const result = TestBed.runInInjectionContext(() =>
      secretariatPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('secretariatPermissionGuard redirects users without secretariat:read', () => {
    currentUser.set(buildUser([]));
    const result = TestBed.runInInjectionContext(() =>
      secretariatPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('redirect-tree');
  });

  it('assetsPermissionGuard allows users with assets:read', () => {
    currentUser.set(buildUser(['assets:read']));
    const result = TestBed.runInInjectionContext(() =>
      assetsPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('assetsPermissionGuard redirects users with only finance:read (granular)', () => {
    currentUser.set(buildUser(['finance:read']));
    const result = TestBed.runInInjectionContext(() =>
      assetsPermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('redirect-tree');
  });

  it('redirects when there is no authenticated user', () => {
    const result = TestBed.runInInjectionContext(() =>
      financePermissionGuard({} as never, {} as never),
    );
    expect(result).toBe('redirect-tree');
  });
});
