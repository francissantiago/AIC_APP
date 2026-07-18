import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import { ICongregation } from '@interfaces/ICongregation';
import { IUpdateCongregation } from '@interfaces/IUpdateCongregation';

@Injectable({
  providedIn: 'root',
})
export class CongregationService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/congregation`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  get(): Observable<ICongregation> {
    return this.#http
      .get<ICongregation>(this.#apiUrl, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(body: IUpdateCongregation): Observable<ICongregation> {
    return this.#http
      .patch<ICongregation>(this.#apiUrl, body, { headers: this.#headers })
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
