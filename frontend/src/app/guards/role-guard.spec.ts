import { FINANCE_READ_ROLES, FINANCE_WRITE_ROLES, hasAnyRole } from './role-guard';

describe('role helpers', () => {
  it('allows the approved read roles', () => {
    expect(hasAnyRole(['PASTOR'], FINANCE_READ_ROLES)).toBe(true);
    expect(hasAnyRole(['TREASURER'], FINANCE_READ_ROLES)).toBe(true);
  });

  it('keeps pastor read-only and denies unrelated roles', () => {
    expect(hasAnyRole(['PASTOR'], FINANCE_WRITE_ROLES)).toBe(false);
    expect(hasAnyRole(['MEMBER'], FINANCE_READ_ROLES)).toBe(false);
  });
});
