import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MembersController } from './members.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em `MembersController` (via
 * `Reflector` real, sem mock), garantindo que cada endpoint exige a
 * permissão correta descrita em §7.2 da spec.
 */
describe('MembersController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  /** Evita `@typescript-eslint/unbound-method`: obtém a referência do handler sem o typing de método ligado à instância. */
  const handlerOf = (methodName: keyof MembersController): (() => unknown) =>
    Reflect.get(MembersController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => MembersController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof MembersController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof MembersController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('GET /members e GET /members/:id exigem members:read', () => {
    it('permite com members:read', () => {
      expectAllowed('findAll', ['members:read']);
      expectAllowed('findOne', ['members:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem members:read', () => {
      expectForbidden('findAll', ['users:read']);
      expectForbidden('findOne', []);
    });
  });

  describe('GET /members/:id/ministries exige ministries:read', () => {
    it('permite com ministries:read (override da classe)', () => {
      expectAllowed('findMinistries', ['ministries:read']);
    });

    it('nega com apenas members:read', () => {
      expectForbidden('findMinistries', ['members:read']);
    });
  });

  describe('POST /members, PATCH /members/:id e DELETE /members/:id exigem members:write', () => {
    it('permite com members:write', () => {
      expectAllowed('create', ['members:write']);
      expectAllowed('update', ['members:write']);
      expectAllowed('remove', ['members:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com members:read', () => {
      expectForbidden('create', ['members:read']);
      expectForbidden('update', ['members:read']);
      expectForbidden('remove', ['members:read']);
    });
  });

  describe('regressão: papéis reais do ambiente (ADMIN, TREASURER) mantêm acesso total', () => {
    it('ADMIN/TREASURER (members:read+write) acessam todos os endpoints', () => {
      const permissions = ['members:read', 'members:write'];
      expectAllowed('findAll', permissions);
      expectAllowed('findOne', permissions);
      expectAllowed('create', permissions);
      expectAllowed('update', permissions);
      expectAllowed('remove', permissions);
    });
  });
});
