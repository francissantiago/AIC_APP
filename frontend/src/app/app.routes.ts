import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth-guard';
import { guestGuard } from '@guards/guest-guard';
import { financeRoleGuard, secretariatRoleGuard } from '@guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@components/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@components/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        loadComponent: () =>
          import('@components/users/users-list/users-list').then((m) => m.UsersList),
      },
      {
        path: 'users/new',
        pathMatch: 'full',
        redirectTo: 'users',
      },
      {
        path: 'users/:id/edit',
        redirectTo: 'users',
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('@components/roles/roles-catalog/roles-catalog').then((m) => m.RolesCatalog),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('@components/members/members-list/members-list').then((m) => m.MembersList),
      },
      {
        path: 'members/new',
        pathMatch: 'full',
        redirectTo: 'members',
      },
      {
        path: 'members/:id/edit',
        redirectTo: 'members',
      },
      {
        path: 'congregation',
        loadComponent: () =>
          import('@components/congregations/congregation-form/congregation-form').then(
            (m) => m.CongregationForm,
          ),
      },
      {
        path: 'congregations',
        pathMatch: 'full',
        redirectTo: 'congregation',
      },
      {
        path: 'congregations/new',
        redirectTo: 'congregation',
      },
      {
        path: 'congregations/:id/edit',
        redirectTo: 'congregation',
      },
      {
        path: 'congregations/:id',
        redirectTo: 'congregation',
      },
      {
        path: 'example',
        loadComponent: () => import('@components/example/example/example').then((m) => m.Example),
      },
      {
        path: 'finance',
        canActivate: [financeRoleGuard],
        loadComponent: () =>
          import('@components/finance/financial-dashboard/financial-dashboard').then(
            (m) => m.FinancialDashboard,
          ),
      },
      {
        path: 'finance/entries',
        canActivate: [financeRoleGuard],
        loadComponent: () =>
          import('@components/finance/financial-entries/financial-entries').then(
            (m) => m.FinancialEntries,
          ),
      },
      {
        path: 'finance/assets',
        canActivate: [financeRoleGuard],
        loadComponent: () =>
          import('@components/assets/assets-list/assets-list').then((m) => m.AssetsList),
      },
      {
        path: 'finance/reports',
        canActivate: [financeRoleGuard],
        loadComponent: () =>
          import('@components/finance/financial-reports/financial-reports').then(
            (m) => m.FinancialReports,
          ),
      },
      {
        path: 'secretariat',
        canActivate: [secretariatRoleGuard],
        loadComponent: () =>
          import('@components/secretariat/secretariat-dashboard/secretariat-dashboard').then(
            (m) => m.SecretariatDashboard,
          ),
      },
      {
        path: 'secretariat/agenda',
        canActivate: [secretariatRoleGuard],
        loadComponent: () =>
          import('@components/secretariat/agenda-calendar/agenda-calendar').then(
            (m) => m.AgendaCalendar,
          ),
      },
      {
        path: 'secretariat/visitors',
        canActivate: [secretariatRoleGuard],
        loadComponent: () =>
          import('@components/secretariat/visitors-list/visitors-list').then((m) => m.VisitorsList),
      },
      {
        path: 'secretariat/attendance',
        canActivate: [secretariatRoleGuard],
        loadComponent: () =>
          import('@components/secretariat/attendance-list/attendance-list').then(
            (m) => m.AttendanceList,
          ),
      },
      {
        path: 'secretariat/documents',
        canActivate: [secretariatRoleGuard],
        loadComponent: () =>
          import('@components/secretariat/documents-list/documents-list').then(
            (m) => m.DocumentsList,
          ),
      },
    ],
  },
];
