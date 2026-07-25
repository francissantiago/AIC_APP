import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IConstructionExpense } from '@interfaces/IConstructionExpense';
import {
  ICreateConstructionExpense,
  IPaginatedConstructionExpenses,
  IQueryConstructionExpenses,
} from '@interfaces/IConstructionExpenseQuery';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConstructionExpensesService {
  #http = inject(HttpClient);
  #projectsApiUrl = `${environment.apiUrl}/construction-projects`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  list(
    projectId: string,
    query: IQueryConstructionExpenses = {},
  ): Observable<IPaginatedConstructionExpenses> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IPaginatedConstructionExpenses>(`${this.#projectsApiUrl}/${projectId}/expenses`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  create(projectId: string, body: ICreateConstructionExpense): Observable<IConstructionExpense> {
    return this.#http
      .post<IConstructionExpense>(`${this.#projectsApiUrl}/${projectId}/expenses`, body, {
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
