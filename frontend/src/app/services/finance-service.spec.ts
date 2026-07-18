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

    service
      .entries({
        page: 2,
        limit: 20,
        type: FinancialType.EXPENSE,
        q: 'energy',
        memberId: 'member-1',
      })
      .subscribe();

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
    expect(params.get('memberId')).toBe('member-1');
  });

  it('loads member options for autocomplete', () => {
    http.get.mockReturnValue(of([{ id: 'm1', fullName: 'Ana' }]));

    service.memberOptions({ q: 'An', limit: 20 }).subscribe();

    const params = http.get.mock.calls[0][1].params as HttpParams;
    expect(http.get).toHaveBeenCalledWith(
      `${baseUrl}/member-options`,
      expect.objectContaining({ params: expect.any(HttpParams) }),
    );
    expect(params.get('q')).toBe('An');
    expect(params.get('limit')).toBe('20');
  });

  it('loads member contributions report and csv', () => {
    http.get.mockReturnValueOnce(
      of({
        member: { id: 'm1', fullName: 'Ana' },
        period: { from: '2026-01-01', to: '2026-12-31' },
        summary: {
          total: '100.00',
          tithesTotal: '100.00',
          offeringsTotal: '0.00',
          donationsTotal: '0.00',
          entriesCount: 1,
        },
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
    );
    http.get.mockReturnValueOnce(of(new Blob(['csv'])));

    service
      .memberContributions({
        memberId: 'm1',
        from: '2026-01-01',
        to: '2026-12-31',
        page: 1,
        limit: 20,
      })
      .subscribe();
    service
      .memberContributionsCsv({ memberId: 'm1', from: '2026-01-01', to: '2026-12-31' })
      .subscribe();

    expect(http.get).toHaveBeenNthCalledWith(
      1,
      `${baseUrl}/reports/member-contributions`,
      expect.objectContaining({ params: expect.any(HttpParams) }),
    );
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      `${baseUrl}/reports/member-contributions.csv`,
      expect.objectContaining({ responseType: 'blob' }),
    );
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
