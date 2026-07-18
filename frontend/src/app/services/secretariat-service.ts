import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  IAttendanceQuery,
  IAttendanceRecord,
  ICalendarEvent,
  ICalendarEventsQuery,
  ICreateAttendanceRecord,
  ICreateCalendarEvent,
  ICreateSecretariatDocument,
  ICreateVisitor,
  IConvertVisitorToMember,
  IConvertVisitorToMemberResponse,
  IPaginatedAttendance,
  IPaginatedCalendarEvents,
  IPaginatedSecretariatDocuments,
  IPaginatedVisitors,
  ISecretariatDashboard,
  ISecretariatDocument,
  ISecretariatDocumentsQuery,
  IUpdateAttendanceRecord,
  IUpdateCalendarEvent,
  IUpdateSecretariatDocument,
  IUpdateVisitor,
  IVisitor,
  IVisitorsQuery,
} from '@interfaces/ISecretariat';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

type QueryValue = string | number | boolean | undefined;

@Injectable({ providedIn: 'root' })
export class SecretariatService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/secretariat`;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  dashboard(): Observable<ISecretariatDashboard> {
    return this.#get<ISecretariatDashboard>('dashboard', {});
  }

  calendarEvents(query: ICalendarEventsQuery): Observable<IPaginatedCalendarEvents> {
    return this.#get<IPaginatedCalendarEvents>('calendar-events', query);
  }

  calendarEvent(id: string): Observable<ICalendarEvent> {
    return this.#get<ICalendarEvent>(`calendar-events/${id}`, {});
  }

  createCalendarEvent(body: ICreateCalendarEvent): Observable<ICalendarEvent> {
    return this.#request(this.#http.post<ICalendarEvent>(`${this.#apiUrl}/calendar-events`, body));
  }

  updateCalendarEvent(id: string, body: IUpdateCalendarEvent): Observable<ICalendarEvent> {
    return this.#request(
      this.#http.patch<ICalendarEvent>(`${this.#apiUrl}/calendar-events/${id}`, body),
    );
  }

  removeCalendarEvent(id: string): Observable<void> {
    return this.#request(this.#http.delete<void>(`${this.#apiUrl}/calendar-events/${id}`));
  }

  visitors(query: IVisitorsQuery): Observable<IPaginatedVisitors> {
    return this.#get<IPaginatedVisitors>('visitors', query);
  }

  createVisitor(body: ICreateVisitor): Observable<IVisitor> {
    return this.#request(this.#http.post<IVisitor>(`${this.#apiUrl}/visitors`, body));
  }

  updateVisitor(id: string, body: IUpdateVisitor): Observable<IVisitor> {
    return this.#request(this.#http.patch<IVisitor>(`${this.#apiUrl}/visitors/${id}`, body));
  }

  removeVisitor(id: string): Observable<void> {
    return this.#request(this.#http.delete<void>(`${this.#apiUrl}/visitors/${id}`));
  }

  convertVisitorToMember(
    id: string,
    body: IConvertVisitorToMember = {},
  ): Observable<IConvertVisitorToMemberResponse> {
    return this.#request(
      this.#http.post<IConvertVisitorToMemberResponse>(
        `${this.#apiUrl}/visitors/${id}/convert-to-member`,
        body,
      ),
    );
  }

  attendance(query: IAttendanceQuery): Observable<IPaginatedAttendance> {
    return this.#get<IPaginatedAttendance>('attendance', query);
  }

  createAttendance(body: ICreateAttendanceRecord): Observable<IAttendanceRecord> {
    return this.#request(this.#http.post<IAttendanceRecord>(`${this.#apiUrl}/attendance`, body));
  }

  updateAttendance(id: string, body: IUpdateAttendanceRecord): Observable<IAttendanceRecord> {
    return this.#request(
      this.#http.patch<IAttendanceRecord>(`${this.#apiUrl}/attendance/${id}`, body),
    );
  }

  removeAttendance(id: string): Observable<void> {
    return this.#request(this.#http.delete<void>(`${this.#apiUrl}/attendance/${id}`));
  }

  documents(query: ISecretariatDocumentsQuery): Observable<IPaginatedSecretariatDocuments> {
    return this.#get<IPaginatedSecretariatDocuments>('documents', query);
  }

  createDocument(body: ICreateSecretariatDocument): Observable<ISecretariatDocument> {
    return this.#request(this.#http.post<ISecretariatDocument>(`${this.#apiUrl}/documents`, body));
  }

  updateDocument(id: string, body: IUpdateSecretariatDocument): Observable<ISecretariatDocument> {
    return this.#request(
      this.#http.patch<ISecretariatDocument>(`${this.#apiUrl}/documents/${id}`, body),
    );
  }

  removeDocument(id: string): Observable<void> {
    return this.#request(this.#http.delete<void>(`${this.#apiUrl}/documents/${id}`));
  }

  uploadDocumentFile(id: string, file: File): Observable<ISecretariatDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.#request(
      this.#http.post<ISecretariatDocument>(`${this.#apiUrl}/documents/${id}/upload`, formData),
    );
  }

  downloadDocumentFile(id: string): Observable<Blob> {
    return this.#request(
      this.#http.get(`${this.#apiUrl}/documents/${id}/download`, {
        responseType: 'blob',
      }),
    );
  }

  removeDocumentFile(id: string): Observable<ISecretariatDocument> {
    return this.#request(
      this.#http.delete<ISecretariatDocument>(`${this.#apiUrl}/documents/${id}/file`),
    );
  }

  #get<T>(path: string, query: object): Observable<T> {
    return this.#request(
      this.#http.get<T>(`${this.#apiUrl}/${path}`, { params: this.#params(query) }),
    );
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

  #params(query: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query) as Array<[string, QueryValue]>) {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
