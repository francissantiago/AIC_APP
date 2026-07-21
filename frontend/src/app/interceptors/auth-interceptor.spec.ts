import { HttpInterceptorFn } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth-service';
import { CongregationContextService } from '@services/congregation-context-service';
import { environment } from 'environments/environment';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  const accessToken = signal<string | null>('token-abc');
  const activeCongregationId = signal<string | null>('cong-123');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor as HttpInterceptorFn])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken,
            isAuthenticated: () => !!accessToken(),
            clearSession: vi.fn(),
          },
        },
        {
          provide: CongregationContextService,
          useValue: {
            activeCongregationId,
            memberships: signal([]),
            reresolveAfterDenied: vi.fn(),
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn() },
        },
      ],
    });
  });

  it('adds Authorization and X-Congregation-Id for authenticated API requests', () => {
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get(`${environment.apiUrl}/members`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/members`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(req.request.headers.get('X-Congregation-Id')).toBe('cong-123');
    req.flush([]);
    httpMock.verify();
  });

  it('does not add congregation header on login requests', () => {
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(req.request.headers.has('X-Congregation-Id')).toBe(false);
    req.flush({});
    httpMock.verify();
  });

  it('does not add headers when token is absent', () => {
    accessToken.set(null);
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get(`${environment.apiUrl}/members`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/members`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-Congregation-Id')).toBe(false);
    req.flush([]);
    httpMock.verify();
  });
});
