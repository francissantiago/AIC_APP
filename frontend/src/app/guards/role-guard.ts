import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth-service';
import { getDefaultRouteForUser, hasAnyPermission, hasPermission } from '@utils/authorization';

function redirectFallback(): ReturnType<Router['parseUrl']> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permissions = authService.currentUser()?.permissions ?? [];
  return router.parseUrl(getDefaultRouteForUser(permissions));
}

function createReadPermissionGuard(requiredPermission: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const permissions = authService.currentUser()?.permissions ?? [];

    if (hasPermission(permissions, requiredPermission)) {
      return true;
    }

    return redirectFallback();
  };
}

export { hasAnyPermission, hasPermission, getDefaultRouteForUser } from '@utils/authorization';

export const defaultRouteGuard: CanActivateFn = () => redirectFallback();

export const usersPermissionGuard = createReadPermissionGuard('users:read');
export const rolesPermissionGuard = createReadPermissionGuard('roles:read');
export const membersPermissionGuard = createReadPermissionGuard('members:read');
export const congregationsPermissionGuard = createReadPermissionGuard('congregations:read');
export const financePermissionGuard = createReadPermissionGuard('finance:read');
export const secretariatPermissionGuard = createReadPermissionGuard('secretariat:read');
export const assetsPermissionGuard = createReadPermissionGuard('assets:read');
