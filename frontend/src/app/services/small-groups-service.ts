import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IAddSmallGroupMember } from '@interfaces/IAddSmallGroupMember';
import { ICreateSmallGroup } from '@interfaces/ICreateSmallGroup';
import { ICreateSmallGroupMeeting } from '@interfaces/ICreateSmallGroupMeeting';
import { IPaginatedSmallGroupMeetings } from '@interfaces/IPaginatedSmallGroupMeetings';
import { IPaginatedSmallGroupMembers } from '@interfaces/IPaginatedSmallGroupMembers';
import { IPaginatedSmallGroups } from '@interfaces/IPaginatedSmallGroups';
import {
  IQuerySmallGroupFrequency,
  ISmallGroupFrequencyReport,
} from '@interfaces/ISmallGroupFrequencyReport';
import {
  IQuerySmallGroupLeaderOptions,
  ISmallGroupLeaderOption,
} from '@interfaces/ISmallGroupLeaderOption';
import { ISmallGroup } from '@interfaces/ISmallGroup';
import {
  ISmallGroupMeetingAttendance,
  IUpsertSmallGroupAttendance,
} from '@interfaces/ISmallGroupAttendance';
import { ISmallGroupMeeting } from '@interfaces/ISmallGroupMeeting';
import { ISmallGroupMember } from '@interfaces/ISmallGroupMember';
import {
  IQuerySmallGroupMemberOptions,
  ISmallGroupMemberOption,
} from '@interfaces/ISmallGroupMemberOption';
import { IQuerySmallGroupMeetings } from '@interfaces/IQuerySmallGroupMeetings';
import { IQuerySmallGroupMembers } from '@interfaces/IQuerySmallGroupMembers';
import { IQuerySmallGroups } from '@interfaces/IQuerySmallGroups';
import { IUpdateSmallGroup } from '@interfaces/IUpdateSmallGroup';
import { IUpdateSmallGroupMeeting } from '@interfaces/IUpdateSmallGroupMeeting';
import { IUpdateSmallGroupMember } from '@interfaces/IUpdateSmallGroupMember';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SmallGroupsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/small-groups`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<ISmallGroup[]>([]);
  readonly error = signal(false);

  list(query: IQuerySmallGroups = {}): Observable<IPaginatedSmallGroups> {
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
    if (query.q) {
      params = params.set('q', query.q);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedSmallGroups>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string): Observable<ISmallGroup> {
    return this.#http
      .get<ISmallGroup>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateSmallGroup): Observable<ISmallGroup> {
    return this.#http
      .post<ISmallGroup>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateSmallGroup): Observable<ISmallGroup> {
    return this.#http
      .patch<ISmallGroup>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  leaderOptions(query: IQuerySmallGroupLeaderOptions = {}): Observable<ISmallGroupLeaderOption[]> {
    let params = new HttpParams();

    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<ISmallGroupLeaderOption[]>(`${this.#apiUrl}/leader-options`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  listMembers(
    groupId: string,
    query: IQuerySmallGroupMembers = {},
  ): Observable<IPaginatedSmallGroupMembers> {
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

    return this.#http
      .get<IPaginatedSmallGroupMembers>(`${this.#apiUrl}/${groupId}/members`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  addMember(groupId: string, body: IAddSmallGroupMember): Observable<ISmallGroupMember> {
    return this.#http
      .post<ISmallGroupMember>(`${this.#apiUrl}/${groupId}/members`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateMember(
    groupId: string,
    memberId: string,
    body: IUpdateSmallGroupMember,
  ): Observable<ISmallGroupMember> {
    return this.#http
      .patch<ISmallGroupMember>(`${this.#apiUrl}/${groupId}/members/${memberId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeMember(groupId: string, memberId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${groupId}/members/${memberId}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  memberOptions(
    groupId: string,
    query: IQuerySmallGroupMemberOptions = {},
  ): Observable<ISmallGroupMemberOption[]> {
    let params = new HttpParams();

    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<ISmallGroupMemberOption[]>(`${this.#apiUrl}/${groupId}/member-options`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  listMeetings(
    groupId: string,
    query: IQuerySmallGroupMeetings = {},
  ): Observable<IPaginatedSmallGroupMeetings> {
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

    return this.#http
      .get<IPaginatedSmallGroupMeetings>(`${this.#apiUrl}/${groupId}/meetings`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  createMeeting(groupId: string, body: ICreateSmallGroupMeeting): Observable<ISmallGroupMeeting> {
    return this.#http
      .post<ISmallGroupMeeting>(`${this.#apiUrl}/${groupId}/meetings`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateMeeting(
    groupId: string,
    meetingId: string,
    body: IUpdateSmallGroupMeeting,
  ): Observable<ISmallGroupMeeting> {
    return this.#http
      .patch<ISmallGroupMeeting>(`${this.#apiUrl}/${groupId}/meetings/${meetingId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeMeeting(groupId: string, meetingId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${groupId}/meetings/${meetingId}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  getMeetingAttendance(
    groupId: string,
    meetingId: string,
  ): Observable<ISmallGroupMeetingAttendance> {
    return this.#http
      .get<ISmallGroupMeetingAttendance>(
        `${this.#apiUrl}/${groupId}/meetings/${meetingId}/attendance`,
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  saveMeetingAttendance(
    groupId: string,
    meetingId: string,
    body: IUpsertSmallGroupAttendance,
  ): Observable<ISmallGroupMeetingAttendance> {
    return this.#http
      .put<ISmallGroupMeetingAttendance>(
        `${this.#apiUrl}/${groupId}/meetings/${meetingId}/attendance`,
        body,
        { headers: this.#headers },
      )
      .pipe(this.#withRetry());
  }

  frequencyReport(
    groupId: string,
    query: IQuerySmallGroupFrequency,
  ): Observable<ISmallGroupFrequencyReport> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);

    return this.#http
      .get<ISmallGroupFrequencyReport>(`${this.#apiUrl}/${groupId}/reports/frequency`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  frequencyCsv(groupId: string, query: IQuerySmallGroupFrequency): Observable<Blob> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);

    return this.#http
      .get(`${this.#apiUrl}/${groupId}/reports/frequency.csv`, {
        params,
        responseType: 'blob',
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
