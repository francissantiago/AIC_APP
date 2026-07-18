import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth-service';

/**
 * Legado — mantido para telas internas de finanças/secretaria que ainda decidem
 * visibilidade de ações de escrita por `role.code` fixo (fora do escopo desta
 * migração para ACL por permissões, ver docs/specs/Current_Task_Spec.md §5.6).
 */
export const FINANCE_WRITE_ROLES = ['ADMIN', 'TREASURER'] as const;
export const SECRETARIAT_WRITE_ROLES = ['ADMIN', 'SECRETARY'] as const;

export function hasAnyRole(
  roleCodes: readonly string[],
  acceptedRoles: readonly string[],
): boolean {
  return roleCodes.some((role) => acceptedRoles.includes(role));
}

export function hasAnyPermission(
  permissionCodes: readonly string[],
  acceptedCodes: readonly string[],
): boolean {
  return permissionCodes.some((code) => acceptedCodes.includes(code));
}

export const financePermissionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permissions = authService.currentUser()?.permissions ?? [];

  return hasAnyPermission(permissions, ['finance:read']) || router.createUrlTree(['/users']);
};

export const secretariatPermissionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permissions = authService.currentUser()?.permissions ?? [];

  return hasAnyPermission(permissions, ['secretariat:read']) || router.createUrlTree(['/users']);
};

export const assetsPermissionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permissions = authService.currentUser()?.permissions ?? [];

  return hasAnyPermission(permissions, ['assets:read']) || router.createUrlTree(['/users']);
};
