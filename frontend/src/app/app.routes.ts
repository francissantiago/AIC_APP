import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth-guard';
import { guestGuard } from '@guards/guest-guard';
import {
  announcementsPermissionGuard,
  assetsPermissionGuard,
  classesPermissionGuard,
  congregationsPermissionGuard,
  constructionsPermissionGuard,
  defaultRouteGuard,
  financePermissionGuard,
  membersPermissionGuard,
  membershipCardsPermissionGuard,
  ministriesPermissionGuard,
  missionsPermissionGuard,
  rolesPermissionGuard,
  schedulesPermissionGuard,
  secretariatPermissionGuard,
  smallGroupsPermissionGuard,
  socialProjectsPermissionGuard,
  usersPermissionGuard,
} from '@guards/role-guard';
import { setupCompletedGuard } from '@guards/setup-completed-guard';
import { setupRequiredGuard } from '@guards/setup-required-guard';

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
    path: 'verify-membership-card/:memberId',
    loadComponent: () =>
      import('@components/membership-card-verify/membership-card-verify').then(
        (m) => m.MembershipCardVerify,
      ),
  },
  {
    path: 'setup',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('@components/setup/initial-setup/initial-setup').then((m) => m.InitialSetup),
  },
  {
    path: 'login',
    canActivate: [guestGuard, setupCompletedGuard],
    loadComponent: () => import('@components/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'offline',
    loadComponent: () =>
      import('@components/pwa/pwa-offline-page/pwa-offline-page').then((m) => m.PwaOfflinePage),
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
          import('@components/membership-cards/membership-cards-page/membership-cards-page').then(
            (m) => m.MembershipCardsPage,
          ),
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
        path: 'social-projects',
        canActivate: [socialProjectsPermissionGuard],
        loadComponent: () =>
          import('@components/social-projects/social-projects-page/social-projects-page').then(
            (m) => m.SocialProjectsPage,
          ),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@components/social-projects/social-projects-list/social-projects-list').then(
                (m) => m.SocialProjectsList,
              ),
          },
          {
            path: 'sessions',
            loadComponent: () =>
              import('@components/social-projects/social-project-sessions-list/social-project-sessions-list').then(
                (m) => m.SocialProjectSessionsList,
              ),
          },
          {
            path: 'sessions/:sessionId/attendance',
            loadComponent: () =>
              import('@components/social-projects/social-project-attendance/social-project-attendance').then(
                (m) => m.SocialProjectAttendance,
              ),
          },
        ],
      },
      {
        path: 'missions',
        canActivate: [missionsPermissionGuard],
        loadComponent: () =>
          import('@components/missions/missions-page/missions-page').then((m) => m.MissionsPage),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@components/missions/mission-assignments-list/mission-assignments-list').then(
                (m) => m.MissionAssignmentsList,
              ),
          },
          {
            path: 'fields',
            loadComponent: () =>
              import('@components/missions/mission-fields-list/mission-fields-list').then(
                (m) => m.MissionFieldsList,
              ),
          },
          {
            path: 'booklets',
            loadComponent: () =>
              import('@components/missions/mission-booklets-list/mission-booklets-list').then(
                (m) => m.MissionBookletsList,
              ),
          },
        ],
      },
      {
        path: 'constructions',
        canActivate: [constructionsPermissionGuard],
        loadComponent: () =>
          import('@components/constructions/constructions-page/constructions-page').then(
            (m) => m.ConstructionsPage,
          ),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@components/constructions/construction-projects-list/construction-projects-list').then(
                (m) => m.ConstructionProjectsList,
              ),
          },
          {
            path: 'updates',
            loadComponent: () =>
              import('@components/constructions/construction-updates-list/construction-updates-list').then(
                (m) => m.ConstructionUpdatesList,
              ),
          },
        ],
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
