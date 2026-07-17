import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FinancialType } from '@enums/finance';
import { vi } from 'vitest';
import { FinanceService } from './finance-service';

describe('FinanceService', () => {
  let service: FinanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FinanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends entry filters using the finance contract', () => {
    service.entries({ page: 2, limit: 20, type: FinancialType.EXPENSE, q: 'energy' }).subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url.endsWith('/finance/entries') &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('type') === 'expense',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], total: 0, page: 2, limit: 20 });
  });

  it('does not retry client errors', () => {
    let failures = 0;
    service.categories().subscribe({ error: () => failures++ });

    const request = http.expectOne((candidate) => candidate.url.endsWith('/finance/categories'));
    request.flush({}, { status: 400, statusText: 'Bad Request' });

    expect(failures).toBe(1);
  });

  it('retries server errors three times before failing', async () => {
    vi.useFakeTimers();
    let failures = 0;
    service.categories().subscribe({ error: () => failures++ });

    for (let attempt = 0; attempt < 4; attempt++) {
      const request = http.expectOne((candidate) => candidate.url.endsWith('/finance/categories'));
      request.flush({}, { status: 500, statusText: 'Server Error' });
      if (attempt < 3) {
        await vi.advanceTimersByTimeAsync(1000);
      }
    }

    expect(failures).toBe(1);
    vi.useRealTimers();
  });
});
