import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { UsersService } from '../users/users.service';
import { CongregationsService } from './congregations.service';
import { Congregation } from './entities/congregation.entity';
import { UserCongregation } from './entities/user-congregation.entity';
import { CongregationStatus } from './enums/congregation-status.enum';
import { CongregationType } from './enums/congregation-type.enum';
import { UserCongregationsService } from './user-congregations.service';

describe('UserCongregationsService', () => {
  let service: UserCongregationsService;

  const userId = 'user-1111-2222-3333-444444444444';
  const hqId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const branchId = '11111111-2222-3333-4444-555555555555';

  const userCongregationsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
  };
  const congregationsRepository = {
    find: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const usersService = {
    findOne: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  const baseCongregation = (
    overrides: Partial<Congregation> = {},
  ): Congregation => {
    const congregation = new Congregation();
    congregation.id = hqId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.parentId = null;
    congregation.status = CongregationStatus.ACTIVE;
    congregation.deletedAt = null;
    Object.assign(congregation, overrides);
    return congregation;
  };

  const baseMembership = (
    overrides: Partial<UserCongregation> = {},
  ): UserCongregation => {
    const membership = new UserCongregation();
    membership.userId = userId;
    membership.congregationId = hqId;
    membership.isDefault = true;
    membership.assignedAt = new Date('2026-07-17T00:00:00Z');
    membership.congregation = baseCongregation();
    Object.assign(membership, overrides);
    return membership;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService.findOne.mockResolvedValue({ id: userId });
    dataSource.transaction.mockImplementation(
      async (callback: (manager: unknown) => Promise<void>) => {
        const manager = {
          delete: jest.fn(),
          create: jest.fn((_entity: unknown, value: unknown) => value),
          save: jest.fn(),
        };
        await callback(manager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCongregationsService,
        {
          provide: getRepositoryToken(UserCongregation),
          useValue: userCongregationsRepository,
        },
        {
          provide: getRepositoryToken(Congregation),
          useValue: congregationsRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(UserCongregationsService);
  });

  describe('listForUser', () => {
    it('deve retornar memberships mapeadas', async () => {
      userCongregationsRepository.find.mockResolvedValue([baseMembership()]);

      const result = await service.listForUser(userId);

      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(1);
      expect(result[0].congregationId).toBe(hqId);
      expect(result[0].isDefault).toBe(true);
    });
  });

  describe('setForUser', () => {
    it('deve substituir memberships completamente', async () => {
      userCongregationsRepository.find.mockResolvedValue([
        baseMembership({ congregationId: branchId, isDefault: true }),
      ]);
      congregationsRepository.find.mockResolvedValue([
        baseCongregation({ id: branchId, type: CongregationType.BRANCH }),
      ]);

      const result = await service.setForUser(userId, {
        congregationIds: [branchId],
        defaultCongregationId: branchId,
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result[0].congregationId).toBe(branchId);
    });

    it('deve lançar 422 quando defaultCongregationId não está em congregationIds', async () => {
      try {
        await service.setForUser(userId, {
          congregationIds: [hqId],
          defaultCongregationId: branchId,
        });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CONGREGATIONS_MEMBERSHIP_DEFAULT_REQUIRED,
        });
      }
    });

    it('deve lançar 404 quando alguma congregação não existe', async () => {
      congregationsRepository.find.mockResolvedValue([baseCongregation()]);

      try {
        await service.setForUser(userId, {
          congregationIds: [hqId, branchId],
          defaultCongregationId: hqId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CONGREGATIONS_NOT_FOUND,
        });
      }
    });
  });

  describe('isMember', () => {
    it('retorna true para membership ativa', async () => {
      userCongregationsRepository.findOne.mockResolvedValue(baseMembership());

      await expect(service.isMember(userId, hqId)).resolves.toBe(true);
    });

    it('retorna false quando congregação inexistente na membership', async () => {
      userCongregationsRepository.findOne.mockResolvedValue(null);

      await expect(service.isMember(userId, hqId)).resolves.toBe(false);
    });

    it('retorna false quando congregação está inativa', async () => {
      userCongregationsRepository.findOne.mockResolvedValue(
        baseMembership({
          congregation: baseCongregation({
            status: CongregationStatus.INACTIVE,
          }),
        }),
      );

      await expect(service.isMember(userId, hqId)).resolves.toBe(false);
    });

    it('retorna false quando congregação foi soft-deleted', async () => {
      userCongregationsRepository.findOne.mockResolvedValue(
        baseMembership({
          congregation: baseCongregation({
            deletedAt: new Date('2026-07-18T00:00:00Z'),
          }),
        }),
      );

      await expect(service.isMember(userId, hqId)).resolves.toBe(false);
    });
  });

  describe('resolveDefaultForUser', () => {
    it('retorna congregação padrão existente', async () => {
      const hq = baseCongregation();
      userCongregationsRepository.findOne.mockResolvedValue(
        baseMembership({ congregation: hq }),
      );

      const result = await service.resolveDefaultForUser(userId);

      expect(result).toBe(hq);
      expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
    });

    it('auto-cura criando membership na HQ quando ausente', async () => {
      const hq = baseCongregation();
      userCongregationsRepository.findOne.mockResolvedValue(null);
      congregationsService.getOrCreateBase.mockResolvedValue(hq);

      const result = await service.resolveDefaultForUser(userId);

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
      expect(userCongregationsRepository.upsert).toHaveBeenCalledWith(
        { userId, congregationId: hq.id, isDefault: true },
        ['userId', 'congregationId'],
      );
      expect(result).toBe(hq);
    });
  });
});
