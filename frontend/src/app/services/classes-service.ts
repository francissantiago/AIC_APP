import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IAddClassEnrollment } from '@interfaces/IAddClassEnrollment';
import { IClassEnrollment } from '@interfaces/IClassEnrollment';
import { IClassFrequencyReport } from '@interfaces/IClassFrequencyReport';
import { IClassSessionAttendance } from '@interfaces/IClassSessionAttendance';
import { IClassTeacherOption } from '@interfaces/IClassTeacherOption';
import { ICreateEbdClass } from '@interfaces/ICreateEbdClass';
import { IEbdClass } from '@interfaces/IEbdClass';
import { IEnrollmentOption } from '@interfaces/IEnrollmentOption';
import { IMemberClassSummary } from '@interfaces/IMemberClassSummary';
import { IPaginatedClassEnrollments } from '@interfaces/IPaginatedClassEnrollments';
import { IPaginatedEbdClasses } from '@interfaces/IPaginatedEbdClasses';
import { IQueryClassEnrollments } from '@interfaces/IQueryClassEnrollments';
import { IQueryClassFrequency } from '@interfaces/IQueryClassFrequency';
import { IQueryClassTeacherOptions } from '@interfaces/IQueryClassTeacherOptions';
import { IQueryEbdClasses } from '@interfaces/IQueryEbdClasses';
import { IQueryEnrollmentOptions } from '@interfaces/IQueryEnrollmentOptions';
import { IUpdateClassEnrollment } from '@interfaces/IUpdateClassEnrollment';
import { IUpdateEbdClass } from '@interfaces/IUpdateEbdClass';
import { IUpsertClassAttendance } from '@interfaces/IUpsertClassAttendance';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClassesService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/classes`;
  #membersApiUrl = `${environment.apiUrl}/members`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly loading = signal(false);
  readonly data = signal<IEbdClass[]>([]);
  readonly error = signal(false);

  list(query: IQueryEbdClasses = {}): Observable<IPaginatedEbdClasses> {
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
    if (query.ageGroup) {
      params = params.set('ageGroup', query.ageGroup);
    }
    if (query.dayOfWeek != null) {
      params = params.set('dayOfWeek', String(query.dayOfWeek));
    }
    if (query.teacherMemberId) {
      params = params.set('teacherMemberId', query.teacherMemberId);
    }
    if (query.q) {
      params = params.set('q', query.q);
    }

    this.loading.set(true);
    this.error.set(false);

    return this.#http
      .get<IPaginatedEbdClasses>(this.#apiUrl, { headers: this.#headers, params })
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

  getById(id: string): Observable<IEbdClass> {
    return this.#http
      .get<IEbdClass>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  create(body: ICreateEbdClass): Observable<IEbdClass> {
    return this.#http
      .post<IEbdClass>(this.#apiUrl, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  update(id: string, body: IUpdateEbdClass): Observable<IEbdClass> {
    return this.#http
      .patch<IEbdClass>(`${this.#apiUrl}/${id}`, body, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  remove(id: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${id}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  teacherOptions(query: IQueryClassTeacherOptions = {}): Observable<IClassTeacherOption[]> {
    let params = new HttpParams();

    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IClassTeacherOption[]>(`${this.#apiUrl}/teacher-options`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  listEnrollments(
    classId: string,
    query: IQueryClassEnrollments = {},
  ): Observable<IPaginatedClassEnrollments> {
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

    return this.#http
      .get<IPaginatedClassEnrollments>(`${this.#apiUrl}/${classId}/enrollments`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  addEnrollment(classId: string, body: IAddClassEnrollment): Observable<IClassEnrollment> {
    return this.#http
      .post<IClassEnrollment>(`${this.#apiUrl}/${classId}/enrollments`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  updateEnrollmentStatus(
    classId: string,
    memberId: string,
    body: IUpdateClassEnrollment,
  ): Observable<IClassEnrollment> {
    return this.#http
      .patch<IClassEnrollment>(`${this.#apiUrl}/${classId}/enrollments/${memberId}`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  removeEnrollment(classId: string, memberId: string): Observable<void> {
    return this.#http
      .delete<void>(`${this.#apiUrl}/${classId}/enrollments/${memberId}`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  enrollmentOptions(
    classId: string,
    query: IQueryEnrollmentOptions = {},
  ): Observable<IEnrollmentOption[]> {
    let params = new HttpParams();

    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IEnrollmentOption[]>(`${this.#apiUrl}/${classId}/enrollment-options`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  listByMember(memberId: string): Observable<IMemberClassSummary[]> {
    return this.#http
      .get<IMemberClassSummary[]>(`${this.#membersApiUrl}/${memberId}/classes`, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  getSessionAttendance(classId: string, sessionDate: string): Observable<IClassSessionAttendance> {
    const params = new HttpParams().set('sessionDate', sessionDate);

    return this.#http
      .get<IClassSessionAttendance>(`${this.#apiUrl}/${classId}/attendance`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  saveSessionAttendance(
    classId: string,
    body: IUpsertClassAttendance,
  ): Observable<IClassSessionAttendance> {
    return this.#http
      .put<IClassSessionAttendance>(`${this.#apiUrl}/${classId}/attendance`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  frequencyReport(classId: string, query: IQueryClassFrequency): Observable<IClassFrequencyReport> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);

    return this.#http
      .get<IClassFrequencyReport>(`${this.#apiUrl}/${classId}/reports/frequency`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  frequencyCsv(classId: string, query: IQueryClassFrequency): Observable<Blob> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);

    return this.#http
      .get(`${this.#apiUrl}/${classId}/reports/frequency.csv`, {
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
