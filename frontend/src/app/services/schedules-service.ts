import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IBulkUpsertAssignments } from '@interfaces/IBulkUpsertAssignments';
import { ICreateScheduleAssignment } from '@interfaces/ICreateScheduleAssignment';
import { IQueryScheduleAssignments } from '@interfaces/IQueryScheduleAssignments';
import {
  IPaginatedScheduleAssignments,
  IScheduleAssignment,
} from '@interfaces/IScheduleAssignment';
import {
  IQueryScheduleMemberOptions,
  IScheduleMemberOption,
} from '@interfaces/IScheduleMemberOption';
import { IQueryScheduleWeekView, IScheduleWeekView } from '@interfaces/IScheduleWeekView';
import { IUpdateScheduleAssignment } from '@interfaces/IUpdateScheduleAssignment';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SchedulesService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/schedules`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly weekView = signal<IScheduleWeekView | null>(null);
  readonly error = signal(false);

  listAssignments(
    query: IQueryScheduleAssignments = {},
  ): Observable<IPaginatedScheduleAssignments> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.from) {
      params = params.set('from', query.from);
    }
    if (query.to) {
      params = params.set('to', query.to);
    }
    if (query.calendarEventId) {
      params = params.set('calendarEventId', query.calendarEventId);
    }
    if (query.ministryId) {
      params = params.set('ministryId', query.ministryId);
    }
    if (query.memberId) {
      params = params.set('memberId', query.memberId);
    }
    if (query.confirmed != null) {
      params = params.set('confirmed', String(query.confirmed));
    }

    return this.#http
      .get<IPaginatedScheduleAssignments>(`${this.#apiUrl}/assignments`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  getAssignment(id: string): Observable<IScheduleAssignment> {
    return this.#http
      .get<IScheduleAssignment>(`${this.#apiUrl}/assignments/${id}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  createAssignment(body: ICreateScheduleAssignment): Observable<IScheduleAssignment> {
    return this.#http
      .post<IScheduleAssignment>(`${this.#apiUrl}/assignments`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateAssignment(id: string, body: IUpdateScheduleAssignment): Observable<IScheduleAssignment> {
    return this.#http
      .patch<IScheduleAssignment>(`${this.#apiUrl}/assignments/${id}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeAssignment(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/assignments/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  getWeekView(query: IQueryScheduleWeekView): Observable<IScheduleWeekView> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);

    if (query.ministryId) {
      params = params.set('ministryId', query.ministryId);
    }
    if (query.unconfirmedOnly != null) {
      params = params.set('unconfirmedOnly', String(query.unconfirmedOnly));
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IScheduleWeekView>(`${this.#apiUrl}/week`, {
        headers: this.#headers,
        params,
      })
      .pipe(
        this.#withRetry(),
        tap({
          next: (response) => {
            this.weekView.set(response);
            this.loading.set(false);
          },
          error: () => {
            this.weekView.set(null);
            this.loading.set(false);
            this.error.set(true);
          },
        }),
      );
  }

  listEventAssignments(calendarEventId: string): Observable<IScheduleAssignment[]> {
    return this.#http
      .get<IScheduleAssignment[]>(`${this.#apiUrl}/events/${calendarEventId}/assignments`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  bulkUpsertAssignments(
    calendarEventId: string,
    ministryId: string,
    body: IBulkUpsertAssignments,
  ): Observable<IScheduleAssignment[]> {
    return this.#http
      .put<IScheduleAssignment[]>(
        `${this.#apiUrl}/events/${calendarEventId}/ministries/${ministryId}/assignments`,
        body,
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  memberOptions(query: IQueryScheduleMemberOptions): Observable<IScheduleMemberOption[]> {
    let params = new HttpParams().set('ministryId', query.ministryId);

    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IScheduleMemberOption[]>(`${this.#apiUrl}/member-options`, {
        headers: this.#headers,
        params,
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
