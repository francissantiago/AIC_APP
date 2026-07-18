import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import { IAssignRoles } from '@interfaces/IAssignRoles';
import { ICreateUser } from '@interfaces/ICreateUser';
import { IPaginatedUsers } from '@interfaces/IPaginatedUsers';
import { IQueryUsers } from '@interfaces/IQueryUsers';
import { IUpdateUser } from '@interfaces/IUpdateUser';
import { IUser } from '@interfaces/IUser';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/users`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(query: IQueryUsers = {}): Observable<IPaginatedUsers> {
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
    if (query.roleCode) {
      params = params.set('roleCode', query.roleCode);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }

    return this.#http
      .get<IPaginatedUsers>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  getById(id: string): Observable<IUser> {
    return this.#http
      .get<IUser>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateUser): Observable<IUser> {
    return this.#http
      .post<IUser>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateUser): Observable<IUser> {
    return this.#http
      .patch<IUser>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  setRoles(id: string, body: IAssignRoles): Observable<IUser> {
    return this.#http
      .put<IUser>(`${this.#apiUrl}/${id}/roles`, body, { headers: this.#headers })
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
