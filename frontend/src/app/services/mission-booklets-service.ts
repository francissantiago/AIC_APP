import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  ICreateMissionBooklet,
  IMissionBookletInstallment,
  IPaginatedMissionBooklets,
  IPayMissionBookletInstallment,
  IQueryMissionBooklets,
  IUpdateMissionBooklet,
} from '@interfaces/IMissionBookletQuery';
import { IMissionBooklet } from '@interfaces/IMissionBooklet';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MissionBookletsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/mission-booklets`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IMissionBooklet[]>([]);
  readonly error = signal(false);

  list(query: IQueryMissionBooklets = {}): Observable<IPaginatedMissionBooklets> {
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
    if (query.destinationType) {
      params = params.set('destinationType', query.destinationType);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.memberId) {
      params = params.set('memberId', query.memberId);
    }
    if (query.missionFieldId) {
      params = params.set('missionFieldId', query.missionFieldId);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedMissionBooklets>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string): Observable<IMissionBooklet> {
    return this.#http
      .get<IMissionBooklet>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateMissionBooklet): Observable<IMissionBooklet> {
    return this.#http
      .post<IMissionBooklet>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateMissionBooklet): Observable<IMissionBooklet> {
    return this.#http
      .patch<IMissionBooklet>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  listInstallments(bookletId: string): Observable<IMissionBookletInstallment[]> {
    return this.#http
      .get<IMissionBookletInstallment[]>(`${this.#apiUrl}/${bookletId}/installments`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  payInstallment(
    bookletId: string,
    installmentId: string,
    body: IPayMissionBookletInstallment,
  ): Observable<IMissionBookletInstallment> {
    return this.#http
      .post<IMissionBookletInstallment>(
        `${this.#apiUrl}/${bookletId}/installments/${installmentId}/pay`,
        body,
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  cancelInstallment(
    bookletId: string,
    installmentId: string,
  ): Observable<IMissionBookletInstallment> {
    return this.#http
      .post<IMissionBookletInstallment>(
        `${this.#apiUrl}/${bookletId}/installments/${installmentId}/cancel`,
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

        console.warn(
          `Error ${error.status} on attempt ${retryCount} of ${this.#retryCount}. Trying again in ${this.#retryDelay}ms...`,
        );
        return timer(this.#retryDelay);
      },
    });
  }
}
