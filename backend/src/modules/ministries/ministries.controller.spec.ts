import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MinistriesController } from './ministries.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em `MinistriesController`.
 */
describe('MinistriesController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const handlerOf = (methodName: keyof MinistriesController): (() => unknown) =>
    Reflect.get(MinistriesController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => MinistriesController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof MinistriesController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof MinistriesController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('leituras exigem ministries:read', () => {
    it('permite com ministries:read', () => {
      expectAllowed('findAll', ['ministries:read']);
      expectAllowed('findOne', ['ministries:read']);
      expectAllowed('findMembers', ['ministries:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem ministries:read', () => {
      expectForbidden('findAll', ['members:read']);
      expectForbidden('findOne', []);
      expectForbidden('findMembers', ['ministries:write']);
    });
  });

  describe('mutações exigem ministries:write', () => {
    it('permite com ministries:write', () => {
      expectAllowed('create', ['ministries:write']);
      expectAllowed('update', ['ministries:write']);
      expectAllowed('remove', ['ministries:write']);
      expectAllowed('addMember', ['ministries:write']);
      expectAllowed('updateMemberRole', ['ministries:write']);
      expectAllowed('removeMember', ['ministries:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com ministries:read', () => {
      expectForbidden('create', ['ministries:read']);
      expectForbidden('update', ['ministries:read']);
      expectForbidden('remove', ['ministries:read']);
      expectForbidden('addMember', ['ministries:read']);
      expectForbidden('updateMemberRole', ['ministries:read']);
      expectForbidden('removeMember', ['ministries:read']);
    });
  });

  describe('regressão: ADMIN (read+write) acessa todos os endpoints', () => {
    it('ADMIN com ministries:read+write acessa leituras e mutações', () => {
      const permissions = ['ministries:read', 'ministries:write'];
      expectAllowed('findAll', permissions);
      expectAllowed('findOne', permissions);
      expectAllowed('findMembers', permissions);
      expectAllowed('create', permissions);
      expectAllowed('update', permissions);
      expectAllowed('remove', permissions);
      expectAllowed('addMember', permissions);
      expectAllowed('updateMemberRole', permissions);
      expectAllowed('removeMember', permissions);
    });
  });
});
