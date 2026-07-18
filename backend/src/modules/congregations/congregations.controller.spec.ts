import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CongregationsController } from './congregations.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em `CongregationsController`
 * (via `Reflector` real, sem mock), garantindo que cada endpoint exige a
 * permissão correta descrita em §7.2 da spec.
 */
describe('CongregationsController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  /** Evita `@typescript-eslint/unbound-method`: obtém a referência do handler sem o typing de método ligado à instância. */
  const handlerOf = (
    methodName: keyof CongregationsController,
  ): (() => unknown) =>
    Reflect.get(CongregationsController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => CongregationsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof CongregationsController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof CongregationsController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('GET /congregation exige congregations:read', () => {
    it('permite com congregations:read', () => {
      expectAllowed('getBase', ['congregations:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem congregations:read', () => {
      expectForbidden('getBase', ['members:read']);
    });
  });

  describe('PATCH /congregation exige congregations:write', () => {
    it('permite com congregations:write', () => {
      expectAllowed('updateBase', ['congregations:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com congregations:read', () => {
      expectForbidden('updateBase', ['congregations:read']);
    });
  });

  describe('regressão: papéis reais do ambiente (ADMIN, TREASURER) mantêm acesso total', () => {
    it('ADMIN/TREASURER (congregations:read+write) acessam todos os endpoints', () => {
      const permissions = ['congregations:read', 'congregations:write'];
      expectAllowed('getBase', permissions);
      expectAllowed('updateBase', permissions);
    });
  });
});
