import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { IDashboardOverview } from '@interfaces/IDashboard';
import { environment } from 'environments/environment';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DashboardService } from './dashboard-service';

describe('DashboardService', () => {
  const baseUrl = `${environment.apiUrl}/dashboard`;
  let http: { get: ReturnType<typeof vi.fn> };
  let service: DashboardService;

  const mockOverview: IDashboardOverview = {
    generatedAt: '2026-07-21T08:00:00Z',
    kpis: {
      activeMembers: 100,
      visitorsThisMonth: 10,
      pendingFollowUps: 3,
      upcomingEventsCount: 5,
      lastAttendanceTotal: 80,
      lastAttendanceDate: '2026-07-20',
      monthIncome: '5000.00',
      monthExpense: '3000.00',
      monthBalance: '2000.00',
      unreadNotifications: 2,
    },
    alerts: [],
    charts: {
      membersByStatus: [{ label: 'Ativo', value: 100 }],
      attendanceByMonth: [{ month: '2026-07', total: 80 }],
      financeByMonth: [{ month: '2026-07', income: '5000.00', expense: '3000.00' }],
    },
    upcomingEvents: [],
    birthdaysThisWeek: [],
    recentAnnouncements: [],
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = { get: vi.fn() };

    TestBed.configureTestingModule({
      providers: [DashboardService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('overview should GET dashboard overview', () => {
    http.get.mockReturnValue(of(mockOverview));

    let result: IDashboardOverview | undefined;
    service.overview().subscribe((value) => {
      result = value;
    });

    expect(http.get).toHaveBeenCalledWith(`${baseUrl}/overview`);
    expect(result).toEqual(mockOverview);
  });

  it('does not retry client errors', () => {
    http.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
    );

    let failures = 0;
    service.overview().subscribe({ error: () => failures++ });

    expect(failures).toBe(1);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('retries server errors three times before failing', async () => {
    vi.useFakeTimers();
    http.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );

    let failures = 0;
    service.overview().subscribe({ error: () => failures++ });

    await vi.advanceTimersByTimeAsync(3000);

    expect(failures).toBe(1);
    expect(http.get).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
