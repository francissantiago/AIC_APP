import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiErrorResponse } from '@interfaces/api-error';
import { AuthService } from '@services/auth-service';
import { CongregationContextService } from '@services/congregation-context-service';
import { environment } from 'environments/environment';
import { catchError, throwError } from 'rxjs';

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl) || url.includes('/api/');
}

function isLoginRequest(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/login/2fa');
}

function parseErrorCode(error: HttpErrorResponse): string | undefined {
  const body = error.error;
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const envelope = body as ApiErrorResponse;
  return typeof envelope.code === 'string' ? envelope.code : undefined;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Assets i18n (/i18n/*.json) e demais não-API não devem puxar AuthService —
  // evita NG0200 com TranslateService durante o bootstrap.
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.accessToken();
  const congregationContext = inject(CongregationContextService);
  const activeCongregationId = congregationContext.activeCongregationId();

  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  if (token && activeCongregationId && !isLoginRequest(req.url)) {
    headers = headers.set('X-Congregation-Id', activeCongregationId);
  }

  const authReq = req.clone({ headers });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const code = parseErrorCode(error);

      if (
        error.status === 403 &&
        code === 'CONGREGATIONS.CONTEXT_DENIED' &&
        congregationContext.memberships().length > 0
      ) {
        congregationContext.reresolveAfterDenied();
      }

      const isLogin = isLoginRequest(req.url);
      if (error.status === 401 && !isLogin && authService.isAuthenticated()) {
        authService.clearSession();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
