import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FinancialType } from '@enums/finance';
import { environment } from 'environments/environment';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FinanceService } from './finance-service';

describe('FinanceService', () => {
  const baseUrl = `${environment.apiUrl}/finance`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: FinanceService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [FinanceService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(FinanceService);
  });

  it('sends entry filters using the finance contract', () => {
    http.get.mockReturnValue(of({ data: [], total: 0, page: 2, limit: 20 }));

    service.entries({ page: 2, limit: 20, type: FinancialType.EXPENSE, q: 'energy' }).subscribe();

    expect(http.get).toHaveBeenCalledWith(
      `${baseUrl}/entries`,
      expect.objectContaining({
        params: expect.any(HttpParams),
      }),
    );
    const params = http.get.mock.calls[0][1].params as HttpParams;
    expect(params.get('page')).toBe('2');
    expect(params.get('type')).toBe('expense');
    expect(params.get('q')).toBe('energy');
  });

  it('does not retry client errors', () => {
    http.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
    );

    let failures = 0;
    service.categories().subscribe({ error: () => failures++ });

    expect(failures).toBe(1);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('retries server errors three times before failing', async () => {
    vi.useFakeTimers();
    http.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );

    let failures = 0;
    service.categories().subscribe({ error: () => failures++ });

    await vi.advanceTimersByTimeAsync(3000);

    expect(failures).toBe(1);
    expect(http.get).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
