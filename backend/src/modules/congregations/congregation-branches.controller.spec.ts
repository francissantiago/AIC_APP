import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CongregationBranchesController } from './congregation-branches.controller';

/**
 * Testes de integração leves: exercitam o `PermissionsGuard` real lendo a
 * metadata `@RequirePermission` real aplicada em
 * `CongregationBranchesController` (via `Reflector` real, sem mock),
 * garantindo que cada endpoint exige a permissão correta descrita em §4.2
 * da spec (SPEC-13, ciclo 2).
 */
describe('CongregationBranchesController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  /** Evita `@typescript-eslint/unbound-method`: obtém a referência do handler sem o typing de método ligado à instância. */
  const handlerOf = (
    methodName: keyof CongregationBranchesController,
  ): (() => unknown) =>
    Reflect.get(CongregationBranchesController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => CongregationBranchesController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof CongregationBranchesController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof CongregationBranchesController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('leituras exigem congregations:read', () => {
    it('permite com congregations:read', () => {
      expectAllowed('findAll', ['congregations:read']);
      expectAllowed('getById', ['congregations:read']);
    });

    it('nega com 403 AUTH.FORBIDDEN sem congregations:read', () => {
      expectForbidden('findAll', ['members:read']);
      expectForbidden('getById', []);
    });
  });

  describe('PATCH /api/congregations/:id exige congregations:write', () => {
    it('permite com congregations:write', () => {
      expectAllowed('update', ['congregations:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com congregations:read', () => {
      expectForbidden('update', ['congregations:read']);
    });
  });

  describe('POST /api/congregations exige congregations:manage_branches', () => {
    it('permite com congregations:manage_branches', () => {
      expectAllowed('createBranch', ['congregations:manage_branches']);
    });

    it('nega com apenas congregations:write (regressão: SECRETARY/TREASURER não criam filial)', () => {
      expectForbidden('createBranch', ['congregations:write']);
    });
  });

  describe('DELETE /api/congregations/:id exige congregations:manage_branches', () => {
    it('permite com congregations:manage_branches', () => {
      expectAllowed('remove', ['congregations:manage_branches']);
    });

    it('nega com apenas congregations:write (regressão: SECRETARY/TREASURER não removem filial)', () => {
      expectForbidden('remove', ['congregations:write']);
    });
  });

  describe('regressão: ADMIN (read+write+manage_branches) acessa todos os endpoints', () => {
    it('ADMIN acessa leituras, mutações e operações estruturais', () => {
      const permissions = [
        'congregations:read',
        'congregations:write',
        'congregations:manage_branches',
      ];
      expectAllowed('findAll', permissions);
      expectAllowed('getById', permissions);
      expectAllowed('update', permissions);
      expectAllowed('createBranch', permissions);
      expectAllowed('remove', permissions);
    });
  });

  describe('regressão: papel real com apenas congregations:write (ex.: SECRETARY/TREASURER)', () => {
    it('é bloqueado em POST/DELETE mas permitido em GET/PATCH', () => {
      const permissions = ['congregations:read', 'congregations:write'];
      expectAllowed('findAll', permissions);
      expectAllowed('getById', permissions);
      expectAllowed('update', permissions);
      expectForbidden('createBranch', permissions);
      expectForbidden('remove', permissions);
    });
  });
});
