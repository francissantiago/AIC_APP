import { ConfigService } from '@nestjs/config';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';

describe('GoogleCalendarOAuthService state', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_TOKEN_ENCRYPTION_KEY') {
        return 'a'.repeat(64);
      }
      if (key === 'JWT_SECRET') {
        return 'jwt-secret';
      }
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'GOOGLE_TOKEN_ENCRYPTION_KEY') {
        return 'a'.repeat(64);
      }
      if (key === 'JWT_SECRET') {
        return 'jwt-secret';
      }
      throw new Error(`missing ${key}`);
    }),
  } as unknown as ConfigService;

  const service = new GoogleCalendarOAuthService(
    configService,
    {} as never,
    {} as never,
    {} as never,
  );

  it('signs and verifies oauth state', () => {
    const payload = {
      congregationId: 'cong-1',
      userId: 'user-1',
      nonce: 'abc123',
      exp: Date.now() + 60_000,
    };
    const state = service.signState(payload);
    expect(service.verifyState(state)).toEqual(payload);
  });

  it('rejects expired state', () => {
    const state = service.signState({
      congregationId: 'cong-1',
      userId: 'user-1',
      nonce: 'abc123',
      exp: Date.now() - 1,
    });
    expect(() => service.verifyState(state)).toThrow('state_expired');
  });

  it('rejects tampered state', () => {
    const state = service.signState({
      congregationId: 'cong-1',
      userId: 'user-1',
      nonce: 'abc123',
      exp: Date.now() + 60_000,
    });
    const [body] = state.split('.');
    expect(() => service.verifyState(`${body}.invalid`)).toThrow();
  });
});
