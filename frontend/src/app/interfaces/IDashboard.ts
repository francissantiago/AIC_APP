import { CalendarEventType } from '@enums/secretariat';

export interface IDashboardKpis {
  activeMembers: number | null;
  visitorsThisMonth: number | null;
  pendingFollowUps: number | null;
  upcomingEventsCount: number | null;
  lastAttendanceTotal: number | null;
  lastAttendanceDate: string | null;
  monthIncome: string | null;
  monthExpense: string | null;
  monthBalance: string | null;
  unreadNotifications: number;
}

export interface IDashboardAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  code: string;
  title: string;
  message: string;
  count?: number | null;
  href?: string | null;
  createdAt: string;
}

export interface IDashboardChartDataPoint {
  label: string;
  value: number;
}

export interface IDashboardMonthlyDataPoint {
  month: string;
  total: number;
}

export interface IDashboardFinanceMonthlyDataPoint {
  month: string;
  income: string;
  expense: string;
}

export interface IDashboardCharts {
  membersByStatus: IDashboardChartDataPoint[] | null;
  attendanceByMonth: IDashboardMonthlyDataPoint[] | null;
  financeByMonth: IDashboardFinanceMonthlyDataPoint[] | null;
}

export interface IDashboardUpcomingEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startsAt: string;
  location: string | null;
}

export interface IDashboardBirthday {
  id: string;
  fullName: string;
  birthDate: string;
}

export interface IDashboardAnnouncement {
  id: string;
  title: string;
  publishedAt: string;
}

export interface IDashboardOverview {
  generatedAt: string;
  kpis: IDashboardKpis;
  alerts: IDashboardAlert[];
  charts: IDashboardCharts;
  upcomingEvents: IDashboardUpcomingEvent[] | null;
  birthdaysThisWeek: IDashboardBirthday[] | null;
  recentAnnouncements: IDashboardAnnouncement[] | null;
}
