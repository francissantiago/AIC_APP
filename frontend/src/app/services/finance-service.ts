import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  IAsset,
  IAssetReport,
  IAssetsQuery,
  ICashFlowCsvQuery,
  ICashFlowQuery,
  ICashFlowReport,
  ICategoryQuery,
  ICreateAsset,
  ICreateFinancialCategory,
  ICreateFinancialEntry,
  IFinancialCategory,
  IFinancialDashboard,
  IFinancialEntriesQuery,
  IFinancialEntry,
  IPaginatedAssets,
  IPaginatedFinancialEntries,
  IPeriodQuery,
  IUpdateAsset,
  IUpdateFinancialCategory,
  IUpdateFinancialEntry,
} from '@interfaces/IFinance';
import { environment } from 'environments/environment';
import { Observable, retry, timer } from 'rxjs';

type QueryValue = string | number | boolean | undefined;

@Injectable({ providedIn: 'root' })
export class FinanceService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/finance`;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  dashboard(query: IPeriodQuery): Observable<IFinancialDashboard> {
    return this.#get<IFinancialDashboard>('dashboard', query);
  }

  categories(query: ICategoryQuery = {}): Observable<IFinancialCategory[]> {
    return this.#get<IFinancialCategory[]>('categories', query);
  }

  createCategory(body: ICreateFinancialCategory): Observable<IFinancialCategory> {
    return this.#request(this.#http.post<IFinancialCategory>(`${this.#apiUrl}/categories`, body));
  }

  updateCategory(id: string, body: IUpdateFinancialCategory): Observable<IFinancialCategory> {
    return this.#request(
      this.#http.patch<IFinancialCategory>(`${this.#apiUrl}/categories/${id}`, body),
    );
  }

  entries(query: IFinancialEntriesQuery): Observable<IPaginatedFinancialEntries> {
    return this.#get<IPaginatedFinancialEntries>('entries', query);
  }

  entry(id: string): Observable<IFinancialEntry> {
    return this.#get<IFinancialEntry>(`entries/${id}`, {});
  }

  createEntry(body: ICreateFinancialEntry): Observable<IFinancialEntry> {
    return this.#request(this.#http.post<IFinancialEntry>(`${this.#apiUrl}/entries`, body));
  }

  updateEntry(id: string, body: IUpdateFinancialEntry): Observable<IFinancialEntry> {
    return this.#request(this.#http.patch<IFinancialEntry>(`${this.#apiUrl}/entries/${id}`, body));
  }

  removeEntry(id: string): Observable<void> {
    return this.#request(this.#http.delete<void>(`${this.#apiUrl}/entries/${id}`));
  }

  assets(query: IAssetsQuery): Observable<IPaginatedAssets> {
    return this.#get<IPaginatedAssets>('assets', query);
  }

  asset(id: string): Observable<IAsset> {
    return this.#get<IAsset>(`assets/${id}`, {});
  }

  createAsset(body: ICreateAsset): Observable<IAsset> {
    return this.#request(this.#http.post<IAsset>(`${this.#apiUrl}/assets`, body));
  }

  updateAsset(id: string, body: IUpdateAsset): Observable<IAsset> {
    return this.#request(this.#http.patch<IAsset>(`${this.#apiUrl}/assets/${id}`, body));
  }

  removeAsset(id: string): Observable<void> {
    return this.#request(this.#http.delete<void>(`${this.#apiUrl}/assets/${id}`));
  }

  cashFlowReport(query: ICashFlowQuery): Observable<ICashFlowReport> {
    return this.#get<ICashFlowReport>('reports/cash-flow', query);
  }

  assetReport(query: IAssetsQuery): Observable<IAssetReport> {
    return this.#get<IAssetReport>('reports/assets', query);
  }

  cashFlowCsv(query: ICashFlowCsvQuery): Observable<Blob> {
    return this.#request(
      this.#http.get(`${this.#apiUrl}/reports/cash-flow.csv`, {
        params: this.#params(query),
        responseType: 'blob',
      }),
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
