import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IAnnouncement } from '@interfaces/IAnnouncement';
import { ICreateAnnouncement } from '@interfaces/ICreateAnnouncement';
import { IAnnouncementsBoard, IPaginatedAnnouncements } from '@interfaces/IPaginatedAnnouncements';
import { IQueryAnnouncements } from '@interfaces/IQueryAnnouncements';
import { IQueryAnnouncementsBoard } from '@interfaces/IQueryAnnouncementsBoard';
import { IUpdateAnnouncement } from '@interfaces/IUpdateAnnouncement';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnnouncementsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/announcements`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IAnnouncement[]>([]);
  readonly error = signal(false);

  list(query: IQueryAnnouncements = {}): Observable<IPaginatedAnnouncements> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.includeExpired != null) {
      params = params.set('includeExpired', String(query.includeExpired));
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedAnnouncements>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(
        this.#withRetry(),
        tap({
          next: (response) => {
            this.data.set(response.data);
            this.loading.set(false);
          },
          error: () => {
            this.data.set([]);
            this.loading.set(false);
            this.error.set(true);
          },
        }),
      );
  }

  listBoard(query: IQueryAnnouncementsBoard = {}): Observable<IAnnouncementsBoard> {
    let params = new HttpParams();
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IAnnouncementsBoard>(`${this.#apiUrl}/board`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  getById(id: string): Observable<IAnnouncement> {
    return this.#http
      .get<IAnnouncement>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateAnnouncement): Observable<IAnnouncement> {
    return this.#http
      .post<IAnnouncement>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateAnnouncement): Observable<IAnnouncement> {
    return this.#http
      .patch<IAnnouncement>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
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
