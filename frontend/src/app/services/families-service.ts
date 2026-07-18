import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IAddFamilyMember } from '@interfaces/IAddFamilyMember';
import { IBirthdayReport } from '@interfaces/IBirthdayReport';
import { ICreateFamily } from '@interfaces/ICreateFamily';
import { IFamily } from '@interfaces/IFamily';
import { IFamilyMember } from '@interfaces/IFamilyMember';
import { IPaginatedFamilies } from '@interfaces/IPaginatedFamilies';
import { IPaginatedFamilyMembers } from '@interfaces/IPaginatedFamilyMembers';
import { IQueryFamilies } from '@interfaces/IQueryFamilies';
import { IQueryFamilyBirthdays } from '@interfaces/IQueryFamilyBirthdays';
import { IQueryFamilyMembers } from '@interfaces/IQueryFamilyMembers';
import { IUpdateFamily } from '@interfaces/IUpdateFamily';
import { IUpdateFamilyMember } from '@interfaces/IUpdateFamilyMember';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FamiliesService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/families`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IFamily[]>([]);
  readonly error = signal(false);

  list(query: IQueryFamilies = {}): Observable<IPaginatedFamilies> {
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

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedFamilies>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string, includeMembers = false): Observable<IFamily> {
    let params = new HttpParams();
    if (includeMembers) {
      params = params.set('includeMembers', 'true');
    }

    return this.#http
      .get<IFamily>(`${this.#apiUrl}/${id}`, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  getByMember(memberId: string): Observable<IFamily> {
    return this.#http
      .get<IFamily>(`${this.#apiUrl}/by-member/${memberId}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateFamily): Observable<IFamily> {
    return this.#http
      .post<IFamily>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateFamily): Observable<IFamily> {
    return this.#http
      .patch<IFamily>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  listMembers(
    familyId: string,
    query: IQueryFamilyMembers = {},
  ): Observable<IPaginatedFamilyMembers> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IPaginatedFamilyMembers>(`${this.#apiUrl}/${familyId}/members`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  addMember(familyId: string, body: IAddFamilyMember): Observable<IFamilyMember> {
    return this.#http
      .post<IFamilyMember>(`${this.#apiUrl}/${familyId}/members`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateMember(
    familyId: string,
    memberId: string,
    body: IUpdateFamilyMember,
  ): Observable<IFamilyMember> {
    return this.#http
      .patch<IFamilyMember>(`${this.#apiUrl}/${familyId}/members/${memberId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeMember(familyId: string, memberId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${familyId}/members/${memberId}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  birthdays(query: IQueryFamilyBirthdays): Observable<IBirthdayReport> {
    let params = new HttpParams().set('month', String(query.month));
    if (query.familyId) {
      params = params.set('familyId', query.familyId);
    }

    return this.#http
      .get<IBirthdayReport>(`${this.#apiUrl}/birthdays`, {
        headers: this.#headers,
        params,
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
