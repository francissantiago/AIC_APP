import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth-service';
import { environment } from 'environments/environment';
import { catchError, throwError } from 'rxjs';

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl) || url.includes('/api/');
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

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes('/auth/login');
      if (error.status === 401 && !isLoginRequest && authService.isAuthenticated()) {
        authService.clearSession();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
