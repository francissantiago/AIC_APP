import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  ICreateMissionAssignment,
  IPaginatedMissionAssignments,
  IQueryMissionAssignments,
  IUpdateMissionAssignment,
} from '@interfaces/IMissionAssignmentQuery';
import { IMissionAssignment } from '@interfaces/IMissionAssignment';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MissionAssignmentsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/mission-assignments`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IMissionAssignment[]>([]);
  readonly error = signal(false);

  list(query: IQueryMissionAssignments = {}): Observable<IPaginatedMissionAssignments> {
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
    if (query.role) {
      params = params.set('role', query.role);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.missionFieldId) {
      params = params.set('missionFieldId', query.missionFieldId);
    }
    if (query.memberId) {
      params = params.set('memberId', query.memberId);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedMissionAssignments>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(
        this.#withRetry(),
        tap({
          next: (response) => {
            this.data.set(response.data);
            this.loading.set(false);
          },
          error: () => {
            this.data.set([]);
            this.loading.set(false);
            this.error.set(true);
          },
        }),
      );
  }

  getById(id: string): Observable<IMissionAssignment> {
    return this.#http
      .get<IMissionAssignment>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateMissionAssignment): Observable<IMissionAssignment> {
    return this.#http
      .post<IMissionAssignment>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateMissionAssignment): Observable<IMissionAssignment> {
    return this.#http
      .patch<IMissionAssignment>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
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
