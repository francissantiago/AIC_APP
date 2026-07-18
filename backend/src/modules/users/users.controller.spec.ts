import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersController } from './users.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em `UsersController` (via
 * `Reflector` real, sem mock), garantindo que cada endpoint exige a
 * permissão correta descrita em §7.2 da spec.
 */
describe('UsersController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  /** Evita `@typescript-eslint/unbound-method`: obtém a referência do handler sem o typing de método ligado à instância. */
  const handlerOf = (methodName: keyof UsersController): (() => unknown) =>
    Reflect.get(UsersController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => UsersController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof UsersController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof UsersController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('GET /users e GET /users/:id exigem users:read', () => {
    it('permite com users:read', () => {
      expectAllowed('findAll', ['users:read']);
      expectAllowed('findOne', ['users:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem users:read', () => {
      expectForbidden('findAll', ['members:read']);
      expectForbidden('findOne', []);
    });
  });

  describe('POST /users, PATCH /users/:id, PUT /users/:id/roles e DELETE /users/:id exigem users:write', () => {
    it('permite com users:write', () => {
      expectAllowed('create', ['users:write']);
      expectAllowed('update', ['users:write']);
      expectAllowed('setRoles', ['users:write']);
      expectAllowed('remove', ['users:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com users:read (sem exceção de autoedição)', () => {
      expectForbidden('create', ['users:read']);
      expectForbidden('update', ['users:read']);
      expectForbidden('setRoles', ['users:read']);
      expectForbidden('remove', ['users:read']);
    });
  });

  describe('regressão: papéis reais do ambiente (ADMIN, TREASURER) mantêm acesso total', () => {
    it('ADMIN/TREASURER (users:read+write) acessam todos os endpoints', () => {
      const permissions = ['users:read', 'users:write'];
      expectAllowed('findAll', permissions);
      expectAllowed('findOne', permissions);
      expectAllowed('create', permissions);
      expectAllowed('update', permissions);
      expectAllowed('setRoles', permissions);
      expectAllowed('remove', permissions);
    });
  });
});
