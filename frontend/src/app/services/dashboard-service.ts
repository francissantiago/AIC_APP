import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IDashboardOverview } from '@interfaces/IDashboard';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/dashboard`;

  overview(): Observable<IDashboardOverview> {
    return this.#request(this.#http.get<IDashboardOverview>(`${this.#apiUrl}/overview`));
  }

  #request<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      retry({
        count: 3,
        delay: (error: HttpErrorResponse) => {
          if (error.status < 500) {
            throw error;
          }
          return timer(1000);
        },
      }),
    );
  }
}
