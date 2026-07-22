import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import { ICreateMember } from '@interfaces/ICreateMember';
import { IMember } from '@interfaces/IMember';
import { IMemberOption, IQueryMemberOptions } from '@interfaces/IMemberOption';
import { IPaginatedMembers } from '@interfaces/IPaginatedMembers';
import { IQueryMembers } from '@interfaces/IQueryMembers';
import { IUpdateMember } from '@interfaces/IUpdateMember';

@Injectable({
  providedIn: 'root',
})
export class MembersService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/members`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(query: IQueryMembers = {}): Observable<IPaginatedMembers> {
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
    if (query.gender) {
      params = params.set('gender', query.gender);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }

    return this.#http
      .get<IPaginatedMembers>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  getById(id: string): Observable<IMember> {
    return this.#http
      .get<IMember>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  options(query: IQueryMemberOptions): Observable<IMemberOption[]> {
    let params = new HttpParams().set('q', query.q);
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.excludeMemberId) {
      params = params.set('excludeMemberId', query.excludeMemberId);
    }
    return this.#http
      .get<IMemberOption[]>(`${this.#apiUrl}/options`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  create(body: ICreateMember): Observable<IMember> {
    return this.#http
      .post<IMember>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateMember): Observable<IMember> {
    return this.#http
      .patch<IMember>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  uploadPhoto(id: string, file: File): Observable<IMember> {
    const formData = new FormData();
    formData.append('file', file);
    return this.#http
      .post<IMember>(`${this.#apiUrl}/${id}/photo`, formData)
      .pipe(this.#withRetry());
  }

  getPhotoBlob(id: string): Observable<Blob> {
    // Sem retry: 5xx em blob (ex.: 502 do proxy) não deve travar o browser.
    return this.#http.get(`${this.#apiUrl}/${id}/photo`, { responseType: 'blob' });
  }

  removePhoto(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}/photo`, { headers: this.#headers })
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
