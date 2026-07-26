import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  IAddSocialProjectMember,
  ICreateSocialProject,
  IPaginatedSocialProjects,
  IQuerySocialProjectMembers,
  ISocialProjectQuery,
  IUpdateSocialProject,
  IUpdateSocialProjectMember,
} from '@interfaces/ISocialProjectQuery';
import { ISocialProject } from '@interfaces/ISocialProject';
import {
  IPaginatedSocialProjectMembers,
  ISocialProjectMember,
} from '@interfaces/ISocialProjectMember';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocialProjectsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/social-projects`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<ISocialProject[]>([]);
  readonly error = signal(false);

  list(query: ISocialProjectQuery = {}): Observable<IPaginatedSocialProjects> {
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
    if (query.category) {
      params = params.set('category', query.category);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedSocialProjects>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(
    id: string,
    options: {
      includeMembersCount?: boolean;
      includeSessionsCount?: boolean;
      includeExpensesCount?: boolean;
    } = {},
  ): Observable<ISocialProject> {
    let params = new HttpParams();
    if (options.includeMembersCount) {
      params = params.set('includeMembersCount', 'true');
    }
    if (options.includeSessionsCount) {
      params = params.set('includeSessionsCount', 'true');
    }
    if (options.includeExpensesCount) {
      params = params.set('includeExpensesCount', 'true');
    }

    return this.#http
      .get<ISocialProject>(`${this.#apiUrl}/${id}`, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  create(body: ICreateSocialProject): Observable<ISocialProject> {
    return this.#http
      .post<ISocialProject>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateSocialProject): Observable<ISocialProject> {
    return this.#http
      .patch<ISocialProject>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  listMembers(
    projectId: string,
    query: IQuerySocialProjectMembers = {},
  ): Observable<IPaginatedSocialProjectMembers> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.role) {
      params = params.set('role', query.role);
    }

    return this.#http
      .get<IPaginatedSocialProjectMembers>(`${this.#apiUrl}/${projectId}/members`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  addMember(projectId: string, body: IAddSocialProjectMember): Observable<ISocialProjectMember> {
    return this.#http
      .post<ISocialProjectMember>(`${this.#apiUrl}/${projectId}/members`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateMemberRole(
    projectId: string,
    memberId: string,
    body: IUpdateSocialProjectMember,
  ): Observable<ISocialProjectMember> {
    return this.#http
      .patch<ISocialProjectMember>(`${this.#apiUrl}/${projectId}/members/${memberId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeMember(projectId: string, memberId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${projectId}/members/${memberId}`, {
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
