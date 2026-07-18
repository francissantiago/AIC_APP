import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { SchedulesController } from './schedules.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em `SchedulesController`.
 */
describe('SchedulesController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const handlerOf = (methodName: keyof SchedulesController): (() => unknown) =>
    Reflect.get(SchedulesController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => SchedulesController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof SchedulesController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof SchedulesController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('leituras exigem schedules:read', () => {
    it('permite com schedules:read', () => {
      expectAllowed('findAll', ['schedules:read']);
      expectAllowed('findOne', ['schedules:read']);
      expectAllowed('weekView', ['schedules:read']);
      expectAllowed('findByEvent', ['schedules:read']);
      expectAllowed('memberOptions', ['schedules:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem schedules:read', () => {
      expectForbidden('findAll', ['ministries:read']);
      expectForbidden('weekView', []);
      expectForbidden('memberOptions', ['schedules:write']);
    });
  });

  describe('mutações exigem schedules:write', () => {
    it('permite com schedules:write', () => {
      expectAllowed('create', ['schedules:write']);
      expectAllowed('update', ['schedules:write']);
      expectAllowed('remove', ['schedules:write']);
      expectAllowed('bulkUpsert', ['schedules:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com schedules:read', () => {
      expectForbidden('create', ['schedules:read']);
      expectForbidden('update', ['schedules:read']);
      expectForbidden('remove', ['schedules:read']);
      expectForbidden('bulkUpsert', ['schedules:read']);
    });
  });

  describe('regressão: ADMIN (read+write) acessa todos os endpoints', () => {
    it('ADMIN com schedules:read+write acessa leituras e mutações', () => {
      const permissions = ['schedules:read', 'schedules:write'];
      expectAllowed('findAll', permissions);
      expectAllowed('findOne', permissions);
      expectAllowed('weekView', permissions);
      expectAllowed('findByEvent', permissions);
      expectAllowed('memberOptions', permissions);
      expectAllowed('create', permissions);
      expectAllowed('update', permissions);
      expectAllowed('remove', permissions);
      expectAllowed('bulkUpsert', permissions);
    });
  });
});
