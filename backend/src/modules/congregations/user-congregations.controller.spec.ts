import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { SetUserCongregationsDto } from './dto/set-user-congregations.dto';
import { UserCongregationsController } from './user-congregations.controller';
import { UserCongregationsService } from './user-congregations.service';

describe('UserCongregationsController', () => {
  let controller: UserCongregationsController;

  const userCongregationsService = {
    listForUser: jest.fn(),
    setForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCongregationsController],
      providers: [
        {
          provide: UserCongregationsService,
          useValue: userCongregationsService,
        },
      ],
    }).compile();

    controller = module.get(UserCongregationsController);
  });

  it('deve delegar GET ao service', async () => {
    const userId = 'user-1111-2222-3333-444444444444';
    const response = [{ congregationId: 'hq-id', isDefault: true }];
    userCongregationsService.listForUser.mockResolvedValue(response);

    await expect(controller.findForUser(userId)).resolves.toEqual(response);
    expect(userCongregationsService.listForUser).toHaveBeenCalledWith(userId);
  });

  it('deve delegar PUT ao service', async () => {
    const userId = 'user-1111-2222-3333-444444444444';
    const dto: SetUserCongregationsDto = {
      congregationIds: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
      defaultCongregationId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    };
    const response = [
      { congregationId: dto.defaultCongregationId, isDefault: true },
    ];
    userCongregationsService.setForUser.mockResolvedValue(response);

    await expect(controller.setForUser(userId, dto)).resolves.toEqual(response);
    expect(userCongregationsService.setForUser).toHaveBeenCalledWith(
      userId,
      dto,
    );
  });
});

describe('UserCongregationsController (PermissionsGuard aplicado)', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  const handlerOf = (
    methodName: keyof UserCongregationsController,
  ): (() => unknown) =>
    Reflect.get(UserCongregationsController.prototype, methodName);

  const buildContext = (
    handler: () => unknown,
    permissions: string[],
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => UserCongregationsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } as UserResponseDto }),
      }),
    }) as unknown as ExecutionContext;

  it('permite GET/PUT com congregations:manage_members', () => {
    const permissions = ['congregations:manage_members'];
    expect(
      guard.canActivate(buildContext(handlerOf('findForUser'), permissions)),
    ).toBe(true);
    expect(
      guard.canActivate(buildContext(handlerOf('setForUser'), permissions)),
    ).toBe(true);
  });

  it('nega sem congregations:manage_members', () => {
    expect(() =>
      guard.canActivate(buildContext(handlerOf('findForUser'), ['users:read'])),
    ).toThrow(ApiException);
    expect(() =>
      guard.canActivate(buildContext(handlerOf('setForUser'), [])),
    ).toThrow(ApiException);
  });
});
