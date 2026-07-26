import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ISocialProjectAttendance,
  IUpsertSocialProjectAttendance,
} from '@interfaces/ISocialProjectAttendance';
import {
  ICreateSocialProjectSession,
  IPaginatedSocialProjectSessions,
  ISocialProjectSession,
  IUpdateSocialProjectSession,
} from '@interfaces/ISocialProjectSession';
import { ISocialProjectSessionQuery } from '@interfaces/ISocialProjectSessionQuery';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocialProjectSessionsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/social-projects`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  listGlobal(query: ISocialProjectSessionQuery = {}): Observable<IPaginatedSocialProjectSessions> {
    return this.#http
      .get<IPaginatedSocialProjectSessions>(`${this.#apiUrl}/sessions`, {
        headers: this.#headers,
        params: this.#buildParams(query),
      })
      .pipe(this.#withRetry());
  }

  listByProject(
    projectId: string,
    query: ISocialProjectSessionQuery = {},
  ): Observable<IPaginatedSocialProjectSessions> {
    return this.#http
      .get<IPaginatedSocialProjectSessions>(`${this.#apiUrl}/${projectId}/sessions`, {
        headers: this.#headers,
        params: this.#buildParams(query),
      })
      .pipe(this.#withRetry());
  }

  create(projectId: string, body: ICreateSocialProjectSession): Observable<ISocialProjectSession> {
    return this.#http
      .post<ISocialProjectSession>(`${this.#apiUrl}/${projectId}/sessions`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  update(
    projectId: string,
    sessionId: string,
    body: IUpdateSocialProjectSession,
  ): Observable<ISocialProjectSession> {
    return this.#http
      .patch<ISocialProjectSession>(`${this.#apiUrl}/${projectId}/sessions/${sessionId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  remove(projectId: string, sessionId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${projectId}/sessions/${sessionId}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  getAttendance(projectId: string, sessionId: string): Observable<ISocialProjectAttendance> {
    return this.#http
      .get<ISocialProjectAttendance>(
        `${this.#apiUrl}/${projectId}/sessions/${sessionId}/attendance`,
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  saveAttendance(
    projectId: string,
    sessionId: string,
    body: IUpsertSocialProjectAttendance,
  ): Observable<ISocialProjectAttendance> {
    return this.#http
      .put<ISocialProjectAttendance>(
        `${this.#apiUrl}/${projectId}/sessions/${sessionId}/attendance`,
        body,
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  #buildParams(query: ISocialProjectSessionQuery): HttpParams {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.socialProjectId) {
      params = params.set('socialProjectId', query.socialProjectId);
    }
    if (query.dateFrom) {
      params = params.set('dateFrom', query.dateFrom);
    }
    if (query.dateTo) {
      params = params.set('dateTo', query.dateTo);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }

    return params;
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
