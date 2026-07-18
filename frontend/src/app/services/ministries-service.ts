import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IAddMinistryMember } from '@interfaces/IAddMinistryMember';
import { ICreateMinistry } from '@interfaces/ICreateMinistry';
import { IMinistry } from '@interfaces/IMinistry';
import { IMinistryMember } from '@interfaces/IMinistryMember';
import { IPaginatedMinistries } from '@interfaces/IPaginatedMinistries';
import { IPaginatedMinistryMembers } from '@interfaces/IPaginatedMinistryMembers';
import { IQueryMinistries } from '@interfaces/IQueryMinistries';
import { IQueryMinistryMembers } from '@interfaces/IQueryMinistryMembers';
import { IUpdateMinistry } from '@interfaces/IUpdateMinistry';
import { IUpdateMinistryMember } from '@interfaces/IUpdateMinistryMember';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MinistriesService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/ministries`;
  #membersApiUrl = `${environment.apiUrl}/members`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IMinistry[]>([]);
  readonly error = signal(false);

  list(query: IQueryMinistries = {}): Observable<IPaginatedMinistries> {
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
    if (query.memberId) {
      params = params.set('memberId', query.memberId);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedMinistries>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string, includeMembers = false): Observable<IMinistry> {
    let params = new HttpParams();
    if (includeMembers) {
      params = params.set('includeMembers', 'true');
    }

    return this.#http
      .get<IMinistry>(`${this.#apiUrl}/${id}`, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  create(body: ICreateMinistry): Observable<IMinistry> {
    return this.#http
      .post<IMinistry>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateMinistry): Observable<IMinistry> {
    return this.#http
      .patch<IMinistry>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  listMembers(
    ministryId: string,
    query: IQueryMinistryMembers = {},
  ): Observable<IPaginatedMinistryMembers> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IPaginatedMinistryMembers>(`${this.#apiUrl}/${ministryId}/members`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  addMember(ministryId: string, body: IAddMinistryMember): Observable<IMinistryMember> {
    return this.#http
      .post<IMinistryMember>(`${this.#apiUrl}/${ministryId}/members`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateMemberRole(
    ministryId: string,
    memberId: string,
    body: IUpdateMinistryMember,
  ): Observable<IMinistryMember> {
    return this.#http
      .patch<IMinistryMember>(`${this.#apiUrl}/${ministryId}/members/${memberId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeMember(ministryId: string, memberId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${ministryId}/members/${memberId}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  listByMember(memberId: string): Observable<IMinistry[]> {
    return this.#http
      .get<IMinistry[]>(`${this.#membersApiUrl}/${memberId}/ministries`, {
        headers: this.#headers,
      })
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
