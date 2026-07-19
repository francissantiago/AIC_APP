import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ICreateBranch } from '@interfaces/ICreateBranch';
import { ICongregation } from '@interfaces/ICongregation';
import { IPaginatedCongregations } from '@interfaces/IPaginatedCongregations';
import { IQueryCongregations } from '@interfaces/IQueryCongregations';
import { IUpdateCongregation } from '@interfaces/IUpdateCongregation';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CongregationsService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/congregations`;
  readonly #retryCount = 3;
  readonly #retryDelay = 1000;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  findAll(query: IQueryCongregations = {}): Observable<IPaginatedCongregations> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.type) {
      params = params.set('type', query.type);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }

    return this.#http
      .get<IPaginatedCongregations>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  getById(id: string): Observable<ICongregation> {
    return this.#http
      .get<ICongregation>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  createBranch(body: ICreateBranch): Observable<ICongregation> {
    return this.#http
      .post<ICongregation>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateCongregation): Observable<ICongregation> {
    return this.#http
      .patch<ICongregation>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
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
