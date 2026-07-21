import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { ClassesService } from '../classes/classes.service';
import { MinistriesService } from '../ministries/ministries.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

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

  describe('GET /members/:id/classes exige classes:read', () => {
    it('permite com classes:read (override da classe)', () => {
      expectAllowed('findClasses', ['classes:read']);
    });

    it('nega com apenas members:read', () => {
      expectForbidden('findClasses', ['members:read']);
    });
  });

  describe('POST /members, PATCH /members/:id e DELETE /members/:id exigem members:write', () => {
    it('permite com members:write', () => {
      expectAllowed('create', ['members:write']);
      expectAllowed('update', ['members:write']);
      expectAllowed('remove', ['members:write']);
      expectAllowed('uploadPhoto', ['members:write']);
      expectAllowed('removePhoto', ['members:write']);
    });

    it('nega com 403 AUTH.FORBIDDEN apenas com members:read', () => {
      expectForbidden('create', ['members:read']);
      expectForbidden('update', ['members:read']);
      expectForbidden('remove', ['members:read']);
      expectForbidden('uploadPhoto', ['members:read']);
      expectForbidden('removePhoto', ['members:read']);
    });
  });

  describe('GET /members/:id/photo exige members:read OU membership-cards:read', () => {
    it('permite com members:read', () => {
      expectAllowed('getPhoto', ['members:read']);
    });

    it('permite com membership-cards:read', () => {
      expectAllowed('getPhoto', ['membership-cards:read']);
    });

    it('nega sem ambas', () => {
      expectForbidden('getPhoto', ['members:write']);
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

describe('MembersController (delegação de contexto)', () => {
  let controller: MembersController;

  const membersService = { findOne: jest.fn() };
  const ministriesService = { findByMemberId: jest.fn() };
  const classesService = { findByMemberId: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        { provide: MembersService, useValue: membersService },
        { provide: MinistriesService, useValue: ministriesService },
        { provide: ClassesService, useValue: classesService },
      ],
    })
      .overrideGuard(CongregationContextGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(MembersController);
  });

  it('findMinistries repassa activeCongregationId ao MinistriesService', async () => {
    const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const congregationId = '22222222-3333-4444-5555-666666666666';
    ministriesService.findByMemberId.mockResolvedValue([]);

    await controller.findMinistries(memberId, congregationId);

    expect(ministriesService.findByMemberId).toHaveBeenCalledWith(
      memberId,
      congregationId,
    );
  });

  it('findClasses repassa activeCongregationId ao ClassesService', async () => {
    const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const congregationId = '22222222-3333-4444-5555-666666666666';
    classesService.findByMemberId.mockResolvedValue([]);

    await controller.findClasses(memberId, congregationId);

    expect(classesService.findByMemberId).toHaveBeenCalledWith(
      memberId,
      congregationId,
    );
  });
});
