import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { CalendarEventType } from '@enums/secretariat';
import { IDashboardOverview } from '@interfaces/IDashboard';
import { DashboardService } from '@services/dashboard-service';
import { of, throwError } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { HomeDashboard } from './home-dashboard';

describe('HomeDashboard', () => {
  let component: HomeDashboard;
  let fixture: ComponentFixture<HomeDashboard>;
  let dashboardService: { overview: ReturnType<typeof vi.fn> };

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
    alerts: [
      {
        id: '1',
        severity: 'critical',
        code: 'OVERDUE_FOLLOWUP',
        title: 'Follow-ups atrasados',
        message: 'Existem follow-ups pendentes há mais de 7 dias',
        count: 3,
        href: '/secretariat/visitors',
        createdAt: '2026-07-21T08:00:00Z',
      },
    ],
    charts: {
      membersByStatus: [{ label: 'Ativo', value: 100 }],
      attendanceByMonth: [{ month: '2026-07', total: 80 }],
      financeByMonth: [{ month: '2026-07', income: '5000.00', expense: '3000.00' }],
    },
    upcomingEvents: [
      {
        id: '1',
        title: 'Culto',
        type: CalendarEventType.SERVICE,
        startsAt: '2026-07-21T19:00:00Z',
        location: 'Templo',
      },
    ],
    birthdaysThisWeek: [
      {
        id: '1',
        fullName: 'João Silva',
        birthDate: '1990-07-22',
      },
    ],
    recentAnnouncements: [
      {
        id: '1',
        title: 'Aviso importante',
        publishedAt: '2026-07-20T08:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    dashboardService = {
      overview: vi.fn().mockReturnValue(of(mockOverview)),
    };

    await TestBed.configureTestingModule({
      imports: [HomeDashboard],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardService },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(HomeDashboard, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeDashboard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load overview on init', () => {
    dashboardService.overview.mockReturnValue(of(mockOverview));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(false);
    expect(component.overview()).toEqual(mockOverview);
  });

  it('should handle error when loading overview', () => {
    dashboardService.overview.mockReturnValue(throwError(() => new Error('API error')));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(true);
    expect(component.overview()).toBeNull();
  });

  it('should compute critical alerts', () => {
    dashboardService.overview.mockReturnValue(of(mockOverview));
    fixture.detectChanges();

    const criticalAlerts = component.criticalAlerts();
    expect(criticalAlerts.length).toBe(1);
    expect(criticalAlerts[0]?.severity).toBe('critical');
  });

  it('should return correct alert severity classes', () => {
    expect(component.alertSeverityClass('critical')).toContain('border-red-500');
    expect(component.alertSeverityClass('warning')).toContain('border-amber-500');
    expect(component.alertSeverityClass('info')).toContain('border-slate-400');
  });

  it('should identify known routes', () => {
    expect(component.isKnownRoute('/secretariat/visitors')).toBe(true);
    expect(component.isKnownRoute('/secretariat/agenda')).toBe(true);
    expect(component.isKnownRoute('/families/birthdays')).toBe(true);
    expect(component.isKnownRoute('/announcements')).toBe(true);
    expect(component.isKnownRoute('/unknown')).toBe(false);
    expect(component.isKnownRoute(null)).toBe(false);
  });
});
