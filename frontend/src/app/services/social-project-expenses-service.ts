import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ISocialProjectExpense } from '@interfaces/ISocialProjectExpense';
import {
  ICreateSocialProjectExpense,
  IPaginatedSocialProjectExpenses,
  ISocialProjectExpenseQuery,
} from '@interfaces/ISocialProjectExpenseQuery';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocialProjectExpensesService {
  #http = inject(HttpClient);
  #projectsApiUrl = `${environment.apiUrl}/social-projects`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(
    projectId: string,
    query: ISocialProjectExpenseQuery = {},
  ): Observable<IPaginatedSocialProjectExpenses> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IPaginatedSocialProjectExpenses>(`${this.#projectsApiUrl}/${projectId}/expenses`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  create(projectId: string, body: ICreateSocialProjectExpense): Observable<ISocialProjectExpense> {
    return this.#http
      .post<ISocialProjectExpense>(`${this.#projectsApiUrl}/${projectId}/expenses`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  remove(projectId: string, entryId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#projectsApiUrl}/${projectId}/expenses/${entryId}`, {
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
