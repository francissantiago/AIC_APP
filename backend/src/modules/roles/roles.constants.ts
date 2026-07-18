export const SYSTEM_ROLE_CODES = [
  'ADMIN',
  'PASTOR',
  'TREASURER',
  'SECRETARY',
  'LEADER',
  'MEMBER',
] as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

export function isSystemRoleCode(code: string): boolean {
  return (SYSTEM_ROLE_CODES as readonly string[]).includes(code);
}
