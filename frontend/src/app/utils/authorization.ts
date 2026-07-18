export function hasAnyPermission(
  permissionCodes: readonly string[],
  acceptedCodes: readonly string[],
): boolean {
  return permissionCodes.some((code) => acceptedCodes.includes(code));
}

export function hasPermission(permissionCodes: readonly string[], code: string): boolean {
  return permissionCodes.includes(code);
}

const DEFAULT_ROUTE_CANDIDATES: readonly { route: string; permission: string }[] = [
  { route: '/users', permission: 'users:read' },
  { route: '/members', permission: 'members:read' },
  { route: '/congregation', permission: 'congregations:read' },
  { route: '/roles', permission: 'roles:read' },
  { route: '/finance', permission: 'finance:read' },
  { route: '/finance/assets', permission: 'assets:read' },
  { route: '/secretariat', permission: 'secretariat:read' },
];

export function getDefaultRouteForUser(permissions: readonly string[]): string {
  for (const candidate of DEFAULT_ROUTE_CANDIDATES) {
    if (hasPermission(permissions, candidate.permission)) {
      return candidate.route;
    }
  }
  return '/no-access';
}
