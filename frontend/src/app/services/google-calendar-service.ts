import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  IGoogleCalendarConnectionStatus,
  IGoogleCalendarDisconnectResponse,
  IGoogleCalendarListResponse,
  IGoogleCalendarOAuthUrl,
  IGoogleCalendarSettingsPatch,
  IGoogleCalendarSyncResult,
} from '@interfaces/IGoogleCalendar';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/secretariat/google-calendar`;
  readonly #retryCount = 3;
  readonly #retryDelay = 1000;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  getStatus(): Observable<IGoogleCalendarConnectionStatus> {
    return this.#http
      .get<IGoogleCalendarConnectionStatus>(`${this.#apiUrl}/status`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  getOAuthUrl(): Observable<IGoogleCalendarOAuthUrl> {
    return this.#http
      .get<IGoogleCalendarOAuthUrl>(`${this.#apiUrl}/oauth/url`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  disconnect(): Observable<IGoogleCalendarDisconnectResponse> {
    return this.#http
      .post<IGoogleCalendarDisconnectResponse>(
        `${this.#apiUrl}/disconnect`,
        {},
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  listCalendars(): Observable<IGoogleCalendarListResponse> {
    return this.#http
      .get<IGoogleCalendarListResponse>(`${this.#apiUrl}/calendars`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateSettings(
    body: IGoogleCalendarSettingsPatch,
  ): Observable<IGoogleCalendarConnectionStatus> {
    return this.#http
      .patch<IGoogleCalendarConnectionStatus>(`${this.#apiUrl}/settings`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  syncNow(): Observable<IGoogleCalendarSyncResult> {
    return this.#http
      .post<IGoogleCalendarSyncResult>(
        `${this.#apiUrl}/sync`,
        {},
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  #withRetry<T>() {
    return retry<T>({
      count: this.#retryCount,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status < 500) {
          throw error;
        }
        return timer(this.#retryDelay * retryCount);
      },
    });
  }
}
