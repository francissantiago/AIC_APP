import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
    };
    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: http },
        { provide: Router, useValue: router },
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

  it('login should map 401 to AUTH.ERROR_INVALID_CREDENTIALS without retry', () => {
    http.post.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    service.login({ email: 'admin@admin.com', password: 'wrong' }).subscribe({
      error: () => undefined,
    });

    expect(service.loginError()).toBe('AUTH.ERROR_INVALID_CREDENTIALS');
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
