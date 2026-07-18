import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { FamiliesController } from './families.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em `FamiliesController`.
 */
describe('FamiliesController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const handlerOf = (methodName: keyof FamiliesController): (() => unknown) =>
    Reflect.get(FamiliesController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => FamiliesController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof FamiliesController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof FamiliesController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('leituras exigem members:read', () => {
    it('permite com members:read', () => {
      expectAllowed('findAll', ['members:read']);
      expectAllowed('findOne', ['members:read']);
      expectAllowed('findBirthdays', ['members:read']);
      expectAllowed('findByMember', ['members:read']);
      expectAllowed('findMembers', ['members:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem members:read', () => {
      expectForbidden('findAll', ['ministries:read']);
      expectForbidden('findOne', []);
      expectForbidden('findBirthdays', ['members:write']);
      expectForbidden('findByMember', []);
      expectForbidden('findMembers', ['ministries:write']);
    });
  });

  describe('mutações exigem members:write', () => {
    it('permite com members:write', () => {
      expectAllowed('create', ['members:write']);
      expectAllowed('update', ['members:write']);
      expectAllowed('remove', ['members:write']);
      expectAllowed('addMember', ['members:write']);
      expectAllowed('updateMemberRelation', ['members:write']);
      expectAllowed('removeMember', ['members:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com members:read', () => {
      expectForbidden('create', ['members:read']);
      expectForbidden('update', ['members:read']);
      expectForbidden('remove', ['members:read']);
      expectForbidden('addMember', ['members:read']);
      expectForbidden('updateMemberRelation', ['members:read']);
      expectForbidden('removeMember', ['members:read']);
    });
  });

  describe('regressão: ADMIN (read+write) acessa todos os endpoints', () => {
    it('ADMIN com members:read+write acessa leituras e mutações', () => {
      const permissions = ['members:read', 'members:write'];
      expectAllowed('findAll', permissions);
      expectAllowed('findOne', permissions);
      expectAllowed('findBirthdays', permissions);
      expectAllowed('findByMember', permissions);
      expectAllowed('findMembers', permissions);
      expectAllowed('create', permissions);
      expectAllowed('update', permissions);
      expectAllowed('remove', permissions);
      expectAllowed('addMember', permissions);
      expectAllowed('updateMemberRelation', permissions);
      expectAllowed('removeMember', permissions);
    });
  });
});
