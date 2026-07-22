import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth-service';
import { CongregationContextService } from '@services/congregation-context-service';
import { environment } from 'environments/environment';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  const accessToken = signal<string | null>('token-abc');
  const activeCongregationId = signal<string | null>('cong-123');
  const clearSession = vi.fn();
  const navigateByUrl = vi.fn();
  const reresolveAfterDenied = vi.fn();

  beforeEach(() => {
    TestBed.resetTestingModule();
    accessToken.set('token-abc');
    activeCongregationId.set('cong-123');
    clearSession.mockReset();
    navigateByUrl.mockReset();
    reresolveAfterDenied.mockReset();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            accessToken,
            isAuthenticated: () => !!accessToken(),
            clearSession,
          },
        },
        {
          provide: CongregationContextService,
          useValue: {
            activeCongregationId,
            memberships: signal([]),
            reresolveAfterDenied,
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl },
        },
      ],
    });
  });

  function runInterceptor(url: string): HttpRequest<unknown> {
    const req = new HttpRequest('GET', url);
    let captured!: HttpRequest<unknown>;

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, (nextReq) => {
        captured = nextReq;
        return of(new HttpResponse({ status: 200, body: [] }));
      }).subscribe();
    });

    expect(captured).toBeTruthy();
    return captured;
  }

  it('adds Authorization and X-Congregation-Id for authenticated API requests', () => {
    const out = runInterceptor(`${environment.apiUrl}/members`);
    expect(out.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(out.headers.get('X-Congregation-Id')).toBe('cong-123');
  });

  it('does not add congregation header on login requests', () => {
    const out = runInterceptor(`${environment.apiUrl}/auth/login`);
    expect(out.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(out.headers.has('X-Congregation-Id')).toBe(false);
  });

  it('does not add headers when token is absent', () => {
    accessToken.set(null);
    const out = runInterceptor(`${environment.apiUrl}/members`);
    expect(out.headers.has('Authorization')).toBe(false);
    expect(out.headers.has('X-Congregation-Id')).toBe(false);
  });

  it('clears session and redirects on 401 for authenticated API requests', () => {
    const req = new HttpRequest('GET', `${environment.apiUrl}/members`);
    let sawError = false;

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 401,
              statusText: 'Unauthorized',
              url: req.url,
              headers: new HttpHeaders(),
            }),
        ),
      ).subscribe({
        error: () => {
          sawError = true;
        },
      });
    });

    expect(sawError).toBe(true);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
