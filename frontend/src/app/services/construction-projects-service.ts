import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IConstructionProject } from '@interfaces/IConstructionProject';
import {
  ICreateConstructionProject,
  IPaginatedConstructionProjects,
  IQueryConstructionProjects,
  IUpdateConstructionProject,
} from '@interfaces/IConstructionProjectQuery';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConstructionProjectsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/construction-projects`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IConstructionProject[]>([]);
  readonly error = signal(false);

  list(query: IQueryConstructionProjects = {}): Observable<IPaginatedConstructionProjects> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.ministryId) {
      params = params.set('ministryId', query.ministryId);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedConstructionProjects>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string): Observable<IConstructionProject> {
    return this.#http
      .get<IConstructionProject>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateConstructionProject): Observable<IConstructionProject> {
    return this.#http
      .post<IConstructionProject>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateConstructionProject): Observable<IConstructionProject> {
    return this.#http
      .patch<IConstructionProject>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
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
