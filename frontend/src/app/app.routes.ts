import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'users',
  },
  {
    path: 'users',
    loadComponent: () => import('@components/users-list/users-list').then((m) => m.UsersList),
  },
  {
    path: 'users/new',
    loadComponent: () => import('@components/user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: 'users/:id/edit',
    loadComponent: () => import('@components/user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('@components/roles-catalog/roles-catalog').then((m) => m.RolesCatalog),
  },
  {
    path: 'example',
    loadComponent: () => import('@components/example/example').then((m) => m.Example),
  },
];
