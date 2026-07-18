import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import { IPermission } from '@interfaces/IPermission';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/permissions`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(): Observable<IPermission[]> {
    return this.#http
      .get<IPermission[]>(this.#apiUrl, { headers: this.#headers })
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
