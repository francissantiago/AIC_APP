import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IConstructionUpdate } from '@interfaces/IConstructionUpdate';
import {
  ICreateConstructionUpdate,
  IPaginatedConstructionUpdates,
  IQueryConstructionUpdates,
  IUpdateConstructionUpdate,
} from '@interfaces/IConstructionUpdateQuery';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConstructionUpdatesService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/construction-updates`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IConstructionUpdate[]>([]);
  readonly error = signal(false);

  list(query: IQueryConstructionUpdates = {}): Observable<IPaginatedConstructionUpdates> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.constructionProjectId) {
      params = params.set('constructionProjectId', query.constructionProjectId);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedConstructionUpdates>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string): Observable<IConstructionUpdate> {
    return this.#http
      .get<IConstructionUpdate>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateConstructionUpdate): Observable<IConstructionUpdate> {
    return this.#http
      .post<IConstructionUpdate>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateConstructionUpdate): Observable<IConstructionUpdate> {
    return this.#http
      .patch<IConstructionUpdate>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
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
