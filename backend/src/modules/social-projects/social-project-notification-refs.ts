import { createHash } from 'node:crypto';

export function buildBudgetAlertReferenceId(projectId: string): string {
  const digest = createHash('sha256')
    .update(`${projectId}:social-budget-80`)
    .digest('hex')
    .slice(0, 32);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
}
