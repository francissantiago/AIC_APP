import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';
import {
  IMembershipCard,
  IMembershipCardSettings,
  IUpdateMembershipCardSettings,
} from '@interfaces/IMembershipCard';

@Injectable({
  providedIn: 'root',
})
export class MembershipCardsService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/membership-cards`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  getCard(memberId: string): Observable<IMembershipCard> {
    return this.#http
      .get<IMembershipCard>(`${this.#apiUrl}/${memberId}`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  getCards(memberIds: string[]): Observable<IMembershipCard[]> {
    const params = new HttpParams().set('memberIds', memberIds.join(','));
    return this.#http
      .get<IMembershipCard[]>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(this.#withRetry());
  }

  getSettings(): Observable<IMembershipCardSettings> {
    return this.#http
      .get<IMembershipCardSettings>(`${this.#apiUrl}/settings`, { headers: this.#headers })
      .pipe(this.#withRetry());
  }

  updateSettings(body: IUpdateMembershipCardSettings): Observable<IMembershipCardSettings> {
    return this.#http
      .patch<IMembershipCardSettings>(`${this.#apiUrl}/settings`, body, {
        headers: this.#headers,
      })
      .pipe(this.#withRetry());
  }

  uploadLogo(file: File): Observable<IMembershipCardSettings> {
    const formData = new FormData();
    formData.append('file', file);
    return this.#http
      .post<IMembershipCardSettings>(`${this.#apiUrl}/settings/logo`, formData)
      .pipe(this.#withRetry());
  }

  uploadSignature(file: File): Observable<IMembershipCardSettings> {
    const formData = new FormData();
    formData.append('file', file);
    return this.#http
      .post<IMembershipCardSettings>(`${this.#apiUrl}/settings/signature`, formData)
      .pipe(this.#withRetry());
  }

  getLogoBlob(): Observable<Blob> {
    const params = new HttpParams().set('_', String(Date.now()));
    return this.#http
      .get(`${this.#apiUrl}/settings/logo`, { responseType: 'blob', params })
      .pipe(this.#withRetry());
  }

  getSignatureBlob(): Observable<Blob> {
    const params = new HttpParams().set('_', String(Date.now()));
    return this.#http
      .get(`${this.#apiUrl}/settings/signature`, { responseType: 'blob', params })
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
