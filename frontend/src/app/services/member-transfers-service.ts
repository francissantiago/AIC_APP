import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import { ICreateMemberTransfer } from '@interfaces/IMemberTransfer';
import { IMemberTransfer } from '@interfaces/IMemberTransfer';

@Injectable({
  providedIn: 'root',
})
export class MemberTransfersService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/members`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(memberId: string): Observable<IMemberTransfer[]> {
    return this.#http
      .get<IMemberTransfer[]>(`${this.#apiUrl}/${memberId}/transfers`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  getById(memberId: string, id: string): Observable<IMemberTransfer> {
    return this.#http
      .get<IMemberTransfer>(`${this.#apiUrl}/${memberId}/transfers/${id}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  create(memberId: string, body: ICreateMemberTransfer): Observable<IMemberTransfer> {
    return this.#http
      .post<IMemberTransfer>(`${this.#apiUrl}/${memberId}/transfers`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  complete(memberId: string, id: string): Observable<IMemberTransfer> {
    return this.#http
      .post<IMemberTransfer>(
        `${this.#apiUrl}/${memberId}/transfers/${id}/complete`,
        {},
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  cancel(memberId: string, id: string): Observable<IMemberTransfer> {
    return this.#http
      .post<IMemberTransfer>(
        `${this.#apiUrl}/${memberId}/transfers/${id}/cancel`,
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
