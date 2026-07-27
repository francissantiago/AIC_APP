import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, Injector, signal } from '@angular/core';
import { ICompleteSetupRequest } from '@interfaces/ICompleteSetupRequest';
import { ICompleteSetupResponse } from '@interfaces/ICompleteSetupResponse';
import { ISetupStatus } from '@interfaces/ISetupStatus';
import { ApiErrorService } from '@services/api-error.service';
import { environment } from 'environments/environment';
import { catchError, finalize, map, Observable, of, retry, tap, throwError, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SetupService {
  readonly #http = inject(HttpClient);
  /** Lazy: evita ciclo ApiErrorService → TranslateService → HttpClient no bootstrap. */
  readonly #injector = inject(Injector);
  readonly #apiUrl = `${environment.apiUrl}/setup`;
  readonly #retryCount = 3;
  readonly #retryDelay = 1000;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly needsSetup = signal(false);
  readonly statusLoaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Resolve o status uma única vez por sessão e mantém o resultado em signal.
   * Nunca propaga erro: guards não devem travar a navegação se a API oscilar.
   */
  ensureStatus(): Observable<boolean> {
    if (this.statusLoaded()) {
      return of(this.needsSetup());
    }

    return this.getStatus().pipe(
      map((status) => status.needsSetup),
      catchError(() => of(this.needsSetup())),
    );
  }

  getStatus(): Observable<ISetupStatus> {
    this.loading.set(true);
    this.error.set(null);

    return this.#http.get<ISetupStatus>(`${this.#apiUrl}/status`, { headers: this.#headers }).pipe(
      this.#withRetry(),
      tap((status) => {
        this.needsSetup.set(status.needsSetup);
        this.statusLoaded.set(true);
      }),
      catchError((error: HttpErrorResponse) => {
        this.error.set(this.#mapError(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  complete(payload: ICompleteSetupRequest): Observable<ICompleteSetupResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.#http
      .post<ICompleteSetupResponse>(this.#apiUrl, payload, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap(() => {
          this.needsSetup.set(false);
          this.statusLoaded.set(true);
        }),
        catchError((error: HttpErrorResponse) => {
          this.error.set(this.#mapError(error));
          return throwError(() => error);
        }),
        finalize(() => this.loading.set(false)),
      );
  }

  clearError(): void {
    this.error.set(null);
  }

  #mapError(error: HttpErrorResponse): string {
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
