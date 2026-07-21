import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../common/errors/api.exception';
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

describe('GoogleCalendarOAuthService configuration', () => {
  function buildService(
    env: Record<string, string | undefined>,
  ): GoogleCalendarOAuthService {
    const configService = {
      get: jest.fn((key: string) => env[key]),
      getOrThrow: jest.fn((key: string) => {
        const value = env[key];
        if (value === undefined) {
          throw new Error(`missing ${key}`);
        }
        return value;
      }),
    } as unknown as ConfigService;

    return new GoogleCalendarOAuthService(
      configService,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  const configuredEnv = {
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost/callback',
    GOOGLE_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
  };

  it('isConfigured is false when client id/secret are missing', () => {
    const service = buildService({
      ...configuredEnv,
      GOOGLE_OAUTH_CLIENT_ID: '',
      GOOGLE_OAUTH_CLIENT_SECRET: undefined,
    });
    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured is true when oauth env is complete', () => {
    expect(buildService(configuredEnv).isConfigured()).toBe(true);
  });

  it('assertConfigured throws NOT_CONFIGURED when incomplete', () => {
    const service = buildService({
      GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    });
    expect(() => service.assertConfigured()).toThrow(ApiException);
  });

  it('getStatus returns configured=false without probing connection', async () => {
    const service = buildService({});
    const findSpy = jest.spyOn(service, 'findActiveConnection');
    await expect(service.getStatus('cong-1')).resolves.toEqual({
      configured: false,
      connected: false,
      status: null,
      email: null,
      googleCalendarId: null,
      syncDirection: null,
      conflictPolicy: null,
      lastSyncAt: null,
      lastSyncError: null,
    });
    expect(findSpy).not.toHaveBeenCalled();
  });
});
