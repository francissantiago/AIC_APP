import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { UserStatus } from '@enums/user-status';
import { IAuthResponse } from '@interfaces/IAuthResponse';
import { IUser } from '@interfaces/IUser';
import { environment } from 'environments/environment';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  const baseUrl = `${environment.apiUrl}/auth`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let service: AuthService;

  const user: IUser = {
    id: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
    username: 'admin',
    email: 'admin@admin.com',
    fullName: 'Administrador',
    status: UserStatus.ACTIVE,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    roles: [],
    permissions: [],
  };

  const authResponse: IAuthResponse = {
    accessToken: 'jwt-token',
    tokenType: 'Bearer',
    expiresIn: '8h',
    user,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    };
    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: http },
        { provide: Router, useValue: router },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) =>
              key === 'ERRORS.AUTH.INVALID_CREDENTIALS' ? 'Invalid credentials.' : key,
          },
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login should POST credentials, store token and set user', () => {
    http.post.mockReturnValue(of(authResponse));

    service.login({ email: 'admin@admin.com', password: 'secret' }).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      `${baseUrl}/login`,
      { email: 'admin@admin.com', password: 'secret' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(sessionStorage.getItem('aic.accessToken')).toBe('jwt-token');
    expect(service.accessToken()).toBe('jwt-token');
    expect(service.currentUser()?.email).toBe('admin@admin.com');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('login with 2FA challenge should not persist token', () => {
    http.post.mockReturnValue(
      of({
        requiresTwoFactor: true,
        preAuthToken: 'preauth-token',
        expiresIn: '5m',
      }),
    );

    service.login({ email: 'admin@admin.com', password: 'secret' }).subscribe();

    expect(sessionStorage.getItem('aic.accessToken')).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.preAuthToken()).toBe('preauth-token');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('loginTwoFactor should persist session', () => {
    http.post.mockReturnValue(of(authResponse));

    service.loginTwoFactor({ preAuthToken: 'preauth', code: '123456' }).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      `${baseUrl}/login/2fa`,
      { preAuthToken: 'preauth', code: '123456' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(sessionStorage.getItem('aic.accessToken')).toBe('jwt-token');
    expect(service.preAuthToken()).toBeNull();
  });

  it('updateMe should PATCH /auth/me and update currentUser', () => {
    const updated = { ...user, fullName: 'Novo Nome' };
    http.patch.mockReturnValue(of(updated));

    service.updateMe({ fullName: 'Novo Nome' }).subscribe();

    expect(http.patch).toHaveBeenCalledWith(
      `${baseUrl}/me`,
      { fullName: 'Novo Nome' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(service.currentUser()?.fullName).toBe('Novo Nome');
  });

  it('changePassword should PATCH /auth/me/password', () => {
    http.patch.mockReturnValue(of(undefined));

    service.changePassword({ currentPassword: 'old', newPassword: 'newpassword' }).subscribe();

    expect(http.patch).toHaveBeenCalledWith(
      `${baseUrl}/me/password`,
      { currentPassword: 'old', newPassword: 'newpassword' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('login should map 401 to translated invalid credentials without retry', () => {
    http.post.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Unauthorized',
            error: {
              statusCode: 401,
              error: 'Unauthorized',
              code: 'AUTH.INVALID_CREDENTIALS',
              message: 'Credenciais inválidas',
            },
          }),
      ),
    );

    service.login({ email: 'admin@admin.com', password: 'wrong' }).subscribe({
      error: () => undefined,
    });

    expect(service.loginError()).toBe('Invalid credentials.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('logout should clear session and navigate to login', () => {
    sessionStorage.setItem('aic.accessToken', 'jwt-token');
    service.accessToken.set('jwt-token');
    service.currentUser.set(user);
    http.post.mockReturnValue(of(undefined));

    service.logout();

    expect(sessionStorage.getItem('aic.accessToken')).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
