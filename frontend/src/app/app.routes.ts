import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth-guard';
import { guestGuard } from '@guards/guest-guard';
import {
  announcementsPermissionGuard,
  assetsPermissionGuard,
  classesPermissionGuard,
  congregationsPermissionGuard,
  defaultRouteGuard,
  financePermissionGuard,
  membersPermissionGuard,
  membershipCardsPermissionGuard,
  ministriesPermissionGuard,
  rolesPermissionGuard,
  schedulesPermissionGuard,
  secretariatPermissionGuard,
  smallGroupsPermissionGuard,
  usersPermissionGuard,
} from '@guards/role-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('@components/legal/public-home/public-home').then((m) => m.PublicHome),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('@components/legal/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('@components/legal/terms-of-service/terms-of-service').then((m) => m.TermsOfService),
  },
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
        path: 'dashboard',
        loadComponent: () =>
          import('@components/dashboard/home-dashboard/home-dashboard').then(
            (m) => m.HomeDashboard,
          ),
      },
      {
        path: 'no-access',
        loadComponent: () => import('@components/auth/no-access/no-access').then((m) => m.NoAccess),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('@components/profile/profile-page/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'announcements',
        canActivate: [announcementsPermissionGuard],
        loadComponent: () =>
          import('@components/announcements/announcements-page/announcements-page').then(
            (m) => m.AnnouncementsPage,
          ),
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
        path: 'membership-cards',
        canActivate: [membershipCardsPermissionGuard],
        loadComponent: () =>
          import(
            '@components/membership-cards/membership-cards-page/membership-cards-page'
          ).then((m) => m.MembershipCardsPage),
      },
      {
        path: 'families/birthdays',
        canActivate: [membersPermissionGuard],
        loadComponent: () =>
          import('@components/families/family-birthdays-report/family-birthdays-report').then(
            (m) => m.FamilyBirthdaysReport,
          ),
      },
      {
        path: 'families',
        canActivate: [membersPermissionGuard],
        loadComponent: () =>
          import('@components/families/families-list/families-list').then((m) => m.FamiliesList),
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
        path: 'ministries',
        canActivate: [ministriesPermissionGuard],
        loadComponent: () =>
          import('@components/ministries/ministries-list/ministries-list').then(
            (m) => m.MinistriesList,
          ),
      },
      {
        path: 'ebd/reports',
        canActivate: [classesPermissionGuard],
        loadComponent: () =>
          import('@components/ebd/class-frequency-report/class-frequency-report').then(
            (m) => m.ClassFrequencyReport,
          ),
      },
      {
        path: 'ebd',
        canActivate: [classesPermissionGuard],
        loadComponent: () =>
          import('@components/ebd/classes-list/classes-list').then((m) => m.ClassesList),
      },
      {
        path: 'small-groups/reports',
        canActivate: [smallGroupsPermissionGuard],
        loadComponent: () =>
          import('@components/small-groups/small-group-frequency-report/small-group-frequency-report').then(
            (m) => m.SmallGroupFrequencyReport,
          ),
      },
      {
        path: 'small-groups',
        canActivate: [smallGroupsPermissionGuard],
        loadComponent: () =>
          import('@components/small-groups/small-groups-list/small-groups-list').then(
            (m) => m.SmallGroupsList,
          ),
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
        canActivate: [congregationsPermissionGuard],
        loadComponent: () =>
          import('@components/congregations/congregations-list/congregations-list').then(
            (m) => m.CongregationsList,
          ),
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
        path: 'secretariat/schedules',
        canActivate: [schedulesPermissionGuard],
        loadComponent: () =>
          import('@components/secretariat/schedules-board/schedules-board').then(
            (m) => m.SchedulesBoard,
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
