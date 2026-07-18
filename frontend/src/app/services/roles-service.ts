import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import { ICreateRole } from '@interfaces/ICreateRole';
import { IRole } from '@interfaces/IRole';
import { IUpdateRole } from '@interfaces/IUpdateRole';

@Injectable({
  providedIn: 'root',
})
export class RolesService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/roles`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(): Observable<IRole[]> {
    return this.#http
      .get<IRole[]>(this.#apiUrl, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  getById(id: number): Observable<IRole> {
    return this.#http
      .get<IRole>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(payload: ICreateRole): Observable<IRole> {
    return this.#http
      .post<IRole>(this.#apiUrl, payload, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: number, payload: IUpdateRole): Observable<IRole> {
    return this.#http
      .patch<IRole>(`${this.#apiUrl}/${id}`, payload, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  delete(id: number): Observable<void> {
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
