import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ISetUserCongregations } from '@interfaces/ISetUserCongregations';
import { IUserCongregation } from '@interfaces/IUserCongregation';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserCongregationsService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/users`;
  readonly #retryCount = 3;
  readonly #retryDelay = 1000;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  listForUser(userId: string): Observable<IUserCongregation[]> {
    return this.#http
      .get<IUserCongregation[]>(`${this.#apiUrl}/${userId}/congregations`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  setForUser(userId: string, body: ISetUserCongregations): Observable<IUserCongregation[]> {
    return this.#http
      .put<IUserCongregation[]>(`${this.#apiUrl}/${userId}/congregations`, body, {
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
