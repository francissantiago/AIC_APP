import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAuthResponse } from '@interfaces/IAuthResponse';
import { ILoginRequest } from '@interfaces/ILoginRequest';
import { IUser } from '@interfaces/IUser';
import { environment } from 'environments/environment';
import { catchError, finalize, Observable, of, tap, throwError } from 'rxjs';

const TOKEN_STORAGE_KEY = 'aic.accessToken';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #apiUrl = `${environment.apiUrl}/auth`;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly accessToken = signal<string | null>(this.#readStoredToken());
  readonly currentUser = signal<IUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.accessToken());
  readonly loginLoading = signal(false);
  readonly loginError = signal<string | null>(null);

  login(payload: ILoginRequest): Observable<IAuthResponse> {
    this.loginLoading.set(true);
    this.loginError.set(null);

    return this.#http
      .post<IAuthResponse>(`${this.#apiUrl}/login`, payload, { headers: this.#headers })
      .pipe(
        tap((response) => {
          this.#persistSession(response.accessToken, response.user);
        }),
        catchError((error: HttpErrorResponse) => {
          this.loginError.set(this.#mapLoginError(error));
          return throwError(() => error);
        }),
        finalize(() => this.loginLoading.set(false)),
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
    if (error.status === 401) {
      return 'AUTH.ERROR_INVALID_CREDENTIALS';
    }
    return 'AUTH.ERROR_GENERIC';
  }
}
