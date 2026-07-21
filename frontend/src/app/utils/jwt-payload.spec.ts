import { decodeJwtPayload } from './jwt-payload';

function buildToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a valid token with defaultCongregationId', () => {
    const token = buildToken({
      sub: 'user-1',
      defaultCongregationId: 'cong-abc',
    });

    expect(decodeJwtPayload(token)).toEqual({
      sub: 'user-1',
      defaultCongregationId: 'cong-abc',
    });
  });

  it('returns null for malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
  });
});
