import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MembershipCardsController } from './membership-cards.controller';

describe('MembershipCardsController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const handlerOf = (
    methodName: keyof MembershipCardsController,
  ): (() => unknown) =>
    Reflect.get(MembershipCardsController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => MembershipCardsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  const expectAllowed = (
    methodName: keyof MembershipCardsController,
    permissions: string[],
  ) =>
    expect(
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toBe(true);

  const expectForbidden = (
    methodName: keyof MembershipCardsController,
    permissions: string[],
  ) =>
    expect(() =>
      guard.canActivate(buildContext(handlerOf(methodName), permissions)),
    ).toThrow(ApiException);

  describe('leitura exige membership-cards:read', () => {
    it('permite com membership-cards:read', () => {
      expectAllowed('getSettings', ['membership-cards:read']);
      expectAllowed('getCard', ['membership-cards:read']);
      expectAllowed('getCardsBatch', ['membership-cards:read']);
      expectAllowed('getLogo', ['membership-cards:read']);
      expectAllowed('getSignature', ['membership-cards:read']);
    });

    it('nega sem membership-cards:read', () => {
      expectForbidden('getSettings', ['members:read']);
      expectForbidden('getCard', []);
    });
  });

  describe('escrita exige membership-cards:write', () => {
    it('permite com membership-cards:write', () => {
      expectAllowed('updateSettings', ['membership-cards:write']);
      expectAllowed('uploadLogo', ['membership-cards:write']);
      expectAllowed('uploadSignature', ['membership-cards:write']);
    });

    it('nega com apenas membership-cards:read', () => {
      expectForbidden('updateSettings', ['membership-cards:read']);
      expectForbidden('uploadLogo', ['membership-cards:read']);
      expectForbidden('uploadSignature', ['membership-cards:read']);
    });
  });
});
