import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth-guard';
import { guestGuard } from '@guards/guest-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@components/login/login').then((m) => m.Login),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'users',
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('@components/users-list/users-list').then((m) => m.UsersList),
  },
  {
    path: 'users/new',
    canActivate: [authGuard],
    loadComponent: () => import('@components/user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: 'users/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('@components/user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: 'roles',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@components/roles-catalog/roles-catalog').then((m) => m.RolesCatalog),
  },
  {
    path: 'members',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@components/members-list/members-list').then((m) => m.MembersList),
  },
  {
    path: 'members/new',
    canActivate: [authGuard],
    loadComponent: () => import('@components/member-form/member-form').then((m) => m.MemberForm),
  },
  {
    path: 'members/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('@components/member-form/member-form').then((m) => m.MemberForm),
  },
  {
    path: 'example',
    canActivate: [authGuard],
    loadComponent: () => import('@components/example/example').then((m) => m.Example),
  },
];
