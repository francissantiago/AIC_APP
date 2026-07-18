import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAuthResponse } from '@interfaces/IAuthResponse';
import { IChangePasswordRequest } from '@interfaces/IChangePasswordRequest';
import { IDisableTwoFactorRequest } from '@interfaces/IDisableTwoFactorRequest';
import { ILoginRequest } from '@interfaces/ILoginRequest';
import { ILoginResult, isTwoFactorChallenge } from '@interfaces/ILoginResult';
import { ILoginTwoFactorRequest } from '@interfaces/ILoginTwoFactorRequest';
import { ITwoFactorCodeRequest } from '@interfaces/ITwoFactorCodeRequest';
import { ITwoFactorSetupResponse } from '@interfaces/ITwoFactorSetupResponse';
import { IUpdateMeRequest } from '@interfaces/IUpdateMeRequest';
import { IUser } from '@interfaces/IUser';
import { ApiErrorService } from '@services/api-error.service';
import {
  hasAnyPermission as checkAnyPermission,
  hasPermission as checkPermission,
} from '@utils/authorization';
import { environment } from 'environments/environment';
import { catchError, finalize, Observable, of, retry, tap, throwError, timer } from 'rxjs';

const TOKEN_STORAGE_KEY = 'aic.accessToken';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  /** Lazy: evita ciclo com interceptor/TranslateService no bootstrap. */
  readonly #injector = inject(Injector);
  readonly #apiUrl = `${environment.apiUrl}/auth`;
  readonly #retryCount = 3;
  readonly #retryDelay = 1000;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly accessToken = signal<string | null>(this.#readStoredToken());
  readonly currentUser = signal<IUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.accessToken());
  readonly loginLoading = signal(false);
  readonly loginError = signal<string | null>(null);
  /** preAuthToken do desafio 2FA — apenas memória, nunca sessionStorage. */
  readonly preAuthToken = signal<string | null>(null);

  hasPermission(code: string): boolean {
    const permissions = this.currentUser()?.permissions ?? [];
    return checkPermission(permissions, code);
  }

  hasAnyPermission(...codes: string[]): boolean {
    const permissions = this.currentUser()?.permissions ?? [];
    return checkAnyPermission(permissions, codes);
  }

  login(payload: ILoginRequest): Observable<ILoginResult> {
    this.loginLoading.set(true);
    this.loginError.set(null);

    return this.#http
      .post<ILoginResult>(`${this.#apiUrl}/login`, payload, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap((response) => {
          if (isTwoFactorChallenge(response)) {
            this.preAuthToken.set(response.preAuthToken);
            return;
          }
          this.preAuthToken.set(null);
          this.#persistSession(response.accessToken, response.user);
        }),
        catchError((error: HttpErrorResponse) => {
          this.loginError.set(this.#mapLoginError(error));
          return throwError(() => error);
        }),
        finalize(() => this.loginLoading.set(false)),
      );
  }

  loginTwoFactor(payload: ILoginTwoFactorRequest): Observable<IAuthResponse> {
    this.loginLoading.set(true);
    this.loginError.set(null);

    return this.#http
      .post<IAuthResponse>(`${this.#apiUrl}/login/2fa`, payload, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap((response) => {
          this.preAuthToken.set(null);
          this.#persistSession(response.accessToken, response.user);
        }),
        catchError((error: HttpErrorResponse) => {
          this.loginError.set(this.#mapLoginError(error));
          return throwError(() => error);
        }),
        finalize(() => this.loginLoading.set(false)),
      );
  }

  clearPreAuthChallenge(): void {
    this.preAuthToken.set(null);
    this.loginError.set(null);
  }

  updateMe(body: IUpdateMeRequest): Observable<IUser> {
    return this.#http.patch<IUser>(`${this.#apiUrl}/me`, body, { headers: this.#headers }).pipe(
      this.#withRetry(),
      tap((user) => this.currentUser.set(user)),
    );
  }

  changePassword(body: IChangePasswordRequest): Observable<void> {
    return this.#http
      .patch<void>(`${this.#apiUrl}/me/password`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  setupTwoFactor(): Observable<ITwoFactorSetupResponse> {
    return this.#http
      .post<ITwoFactorSetupResponse>(`${this.#apiUrl}/me/2fa/setup`, {}, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  verifyTwoFactor(body: ITwoFactorCodeRequest): Observable<IUser> {
    return this.#http
      .post<IUser>(`${this.#apiUrl}/me/2fa/verify`, body, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap((user) => this.currentUser.set(user)),
      );
  }

  disableTwoFactor(body: IDisableTwoFactorRequest): Observable<IUser> {
    return this.#http
      .post<IUser>(`${this.#apiUrl}/me/2fa/disable`, body, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap((user) => this.currentUser.set(user)),
      );
  }

  loadMe(): Observable<IUser | null> {
    const token = this.accessToken();
    if (!token) {
      return of(null);
    }

    return this.#http.get<IUser>(`${this.#apiUrl}/me`, { headers: this.#headers }).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  /**
   * Restaura token do sessionStorage e carrega o perfil.
   * Usado no provideAppInitializer.
   */
  restoreSession(): Promise<void> {
    const token = this.#readStoredToken();
    if (!token) {
      this.accessToken.set(null);
      this.currentUser.set(null);
      return Promise.resolve();
    }

    this.accessToken.set(token);

    return new Promise((resolve) => {
      this.loadMe().subscribe({
        next: () => resolve(),
        error: () => resolve(),
      });
    });
  }

  logout(): void {
    const token = this.accessToken();
    if (token) {
      const headers = this.#headers.set('Authorization', `Bearer ${token}`);
      this.#http
        .post<void>(`${this.#apiUrl}/logout`, {}, { headers })
        .pipe(catchError(() => of(undefined)))
        .subscribe();
    }

    this.clearSession();
    void this.#router.navigateByUrl('/login');
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.loginError.set(null);
    this.preAuthToken.set(null);
  }

  #persistSession(token: string, user: IUser): void {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    this.accessToken.set(token);
    this.currentUser.set(user);
  }

  #readStoredToken(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }

  #mapLoginError(error: HttpErrorResponse): string {
    return this.#injector.get(ApiErrorService).resolve(error).displayMessage;
  }

  #withRetry<T>() {
    return retry<T>({
      count: this.#retryCount,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status < 500) {
          throw error;
        }

        console.warn(
          `Error ${error.status} on attempt ${retryCount} of ${this.#retryCount}. Trying again in ${this.#retryDelay}ms...`,
        );
        return timer(this.#retryDelay);
      },
    });
  }
}
