import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth-service';

export const FINANCE_READ_ROLES = ['ADMIN', 'TREASURER', 'PASTOR'] as const;
export const FINANCE_WRITE_ROLES = ['ADMIN', 'TREASURER'] as const;

export function hasAnyRole(
  roleCodes: readonly string[],
  acceptedRoles: readonly string[],
): boolean {
  return roleCodes.some((role) => acceptedRoles.includes(role));
}

export const financeRoleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = authService.currentUser()?.roles.map((role) => role.code) ?? [];

  return hasAnyRole(roles, FINANCE_READ_ROLES) || router.createUrlTree(['/users']);
};
