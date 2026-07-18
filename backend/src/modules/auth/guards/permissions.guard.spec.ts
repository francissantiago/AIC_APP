import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../../common/errors/api.exception';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const user = {
    permissions: ['secretariat:read', 'members:write'],
  } as UserResponseDto;

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;

  it('concede acesso quando há interseção de código de permissão', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['finance:read', 'secretariat:read']),
    } as unknown as Reflector;

    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });

  it('nega com 403 AUTH.FORBIDDEN quando não há interseção', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['finance:write', 'assets:write']),
    } as unknown as Reflector;

    expect(() => new PermissionsGuard(reflector).canActivate(context)).toThrow(
      ApiException,
    );
  });

  it('libera quando não há metadata (@RequirePermission ausente)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });

  it('libera quando a lista de permissões exigidas está vazia', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    } as unknown as Reflector;

    expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
  });
});
