import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth-guard';
import { guestGuard } from '@guards/guest-guard';
import {
  assetsPermissionGuard,
  congregationsPermissionGuard,
  defaultRouteGuard,
  financePermissionGuard,
  membersPermissionGuard,
  rolesPermissionGuard,
  secretariatPermissionGuard,
  usersPermissionGuard,
} from '@guards/role-guard';

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
      {
        path: '',
        pathMatch: 'full',
        canActivate: [defaultRouteGuard],
        loadComponent: () => import('@components/auth/no-access/no-access').then((m) => m.NoAccess),
      },
      {
        path: 'no-access',
        loadComponent: () => import('@components/auth/no-access/no-access').then((m) => m.NoAccess),
      },
      {
        path: 'users',
        canActivate: [usersPermissionGuard],
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
        canActivate: [rolesPermissionGuard],
        loadComponent: () =>
          import('@components/roles/roles-catalog/roles-catalog').then((m) => m.RolesCatalog),
      },
      {
        path: 'members',
        canActivate: [membersPermissionGuard],
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
        canActivate: [congregationsPermissionGuard],
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
        canActivate: [financePermissionGuard],
        loadComponent: () =>
          import('@components/finance/financial-dashboard/financial-dashboard').then(
            (m) => m.FinancialDashboard,
          ),
      },
      {
        path: 'finance/entries',
        canActivate: [financePermissionGuard],
        loadComponent: () =>
          import('@components/finance/financial-entries/financial-entries').then(
            (m) => m.FinancialEntries,
          ),
      },
      {
        path: 'finance/assets',
        canActivate: [assetsPermissionGuard],
        loadComponent: () =>
          import('@components/assets/assets-list/assets-list').then((m) => m.AssetsList),
      },
      {
        path: 'finance/reports',
        canActivate: [financePermissionGuard],
        loadComponent: () =>
          import('@components/finance/financial-reports/financial-reports').then(
            (m) => m.FinancialReports,
          ),
      },
      {
        path: 'secretariat',
        canActivate: [secretariatPermissionGuard],
        loadComponent: () =>
          import('@components/secretariat/secretariat-dashboard/secretariat-dashboard').then(
            (m) => m.SecretariatDashboard,
          ),
      },
      {
        path: 'secretariat/agenda',
        canActivate: [secretariatPermissionGuard],
        loadComponent: () =>
          import('@components/secretariat/agenda-calendar/agenda-calendar').then(
            (m) => m.AgendaCalendar,
          ),
      },
      {
        path: 'secretariat/visitors',
        canActivate: [secretariatPermissionGuard],
        loadComponent: () =>
          import('@components/secretariat/visitors-list/visitors-list').then((m) => m.VisitorsList),
      },
      {
        path: 'secretariat/attendance',
        canActivate: [secretariatPermissionGuard],
        loadComponent: () =>
          import('@components/secretariat/attendance-list/attendance-list').then(
            (m) => m.AttendanceList,
          ),
      },
      {
        path: 'secretariat/documents',
        canActivate: [secretariatPermissionGuard],
        loadComponent: () =>
          import('@components/secretariat/documents-list/documents-list').then(
            (m) => m.DocumentsList,
          ),
      },
    ],
  },
];
