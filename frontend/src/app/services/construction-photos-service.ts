import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IConstructionPhoto } from '@interfaces/IConstructionPhoto';
import {
  IPaginatedConstructionPhotos,
  IQueryConstructionExpenses,
  IUploadConstructionPhoto,
} from '@interfaces/IConstructionExpenseQuery';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConstructionPhotosService {
  #http = inject(HttpClient);
  #projectsApiUrl = `${environment.apiUrl}/construction-projects`;
  #photosApiUrl = `${environment.apiUrl}/construction-photos`;
  #retryCount = 3;
  #retryDelay = 1000;

  #headers = new HttpHeaders({
    Accept: 'application/json',
  });

  list(
    projectId: string,
    query: IQueryConstructionExpenses = {},
  ): Observable<IPaginatedConstructionPhotos> {
    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }

    return this.#http
      .get<IPaginatedConstructionPhotos>(`${this.#projectsApiUrl}/${projectId}/photos`, {
        headers: this.#headers,
        params,
      })
      .pipe(this.#withRetry());
  }

  upload(projectId: string, payload: IUploadConstructionPhoto): Observable<IConstructionPhoto> {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.caption?.trim()) {
      formData.append('caption', payload.caption.trim());
    }
    if (payload.constructionUpdateId) {
      formData.append('constructionUpdateId', payload.constructionUpdateId);
    }

    return this.#http
      .post<IConstructionPhoto>(`${this.#projectsApiUrl}/${projectId}/photos`, formData)
      .pipe(this.#withRetry());
  }

  getContentBlob(photoId: string): Observable<Blob> {
    return this.#http.get(`${this.#photosApiUrl}/${photoId}/content`, { responseType: 'blob' });
  }

  remove(photoId: string): Observable<void> {
    return this.#http.delete<void>(`${this.#photosApiUrl}/${photoId}`).pipe(this.#withRetry());
  }

  resolveContentUrl(contentUrl: string): string {
    if (contentUrl.startsWith('http')) {
      return contentUrl;
    }
    if (contentUrl.startsWith('/api')) {
      return contentUrl;
    }
    return `${environment.apiUrl}${contentUrl.startsWith('/') ? '' : '/'}${contentUrl}`;
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
