import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment.development';
import { Observable, retry, timer } from 'rxjs';
import { Iexample } from '../interfaces/Iexample';
import { IexamplePatch } from '../interfaces/IexamplePatch';

@Injectable({
  providedIn: 'root',
})
export class ExampleService {
  #http = inject(HttpClient);
  #apiUrl = environment.apiUrl;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  getPostById(id: number): Observable<Iexample> {
    return this.#http.get<Iexample>(`${this.#apiUrl}/${id}`, { headers: this.#headers }).pipe(
      this.#withRetry()
    );
  }

  postPost(body: Iexample): Observable<Iexample> {
    return this.#http.post<Iexample>(`${this.#apiUrl}`, body, { headers: this.#headers }).pipe(
      this.#withRetry()
    );
  }

  putPost(id: number, body: Iexample): Observable<Iexample> {
    return this.#http.put<Iexample>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers }).pipe(
      this.#withRetry()
    );
  }

  patchPost(id: number, body: IexamplePatch): Observable<Iexample> {
    return this.#http.patch<Iexample>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers }).pipe(
      this.#withRetry()
    );
  }

  deletePost(id: number): Observable<Record<string, never>> {
    return this.#http.delete<Record<string, never>>(`${this.#apiUrl}/${id}`, { headers: this.#headers }).pipe(
      this.#withRetry()
    );
  }

  #withRetry<T>() {
    return retry<T>({
      count: this.#retryCount,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status < 500) {
          throw error;
        }

        console.warn(`Error ${error.status} on attempt ${retryCount} of ${this.#retryCount}. Trying again in ${this.#retryDelay}ms...`);
        return timer(this.#retryDelay);
      }
    });
  }
}
