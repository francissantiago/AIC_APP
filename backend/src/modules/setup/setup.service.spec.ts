import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { UserCongregation } from '../congregations/entities/user-congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { SetupService } from './setup.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('SetupService', () => {
  let service: SetupService;

  const hqId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const adminUserId = '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f';
  const passwordHash = '$2b$12$hash-gerado';

  const adminRole: Role = {
    id: 1,
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
    permissions: [],
  };

  const usersRepository = {
    count: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const manager = {
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const dataSource = {
    manager: { count: jest.fn() },
    transaction: jest.fn(),
  };

  const baseHeadquarters = (
    overrides: Partial<Congregation> = {},
  ): Congregation => {
    const congregation = new Congregation();
    congregation.id = hqId;
    congregation.name = 'Congregação';
    congregation.tradeName = null;
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.parentId = null;
    congregation.document = null;
    congregation.email = null;
    congregation.phone = null;
    congregation.address = null;
    congregation.city = null;
    congregation.state = null;
    congregation.zipCode = null;
    congregation.foundationDate = null;
    congregation.website = null;
    congregation.status = CongregationStatus.ACTIVE;
    congregation.notes = null;
    congregation.deletedAt = null;
    Object.assign(congregation, overrides);
    return congregation;
  };

  const completeDto = (overrides: Partial<CompleteSetupDto> = {}) => {
    const dto: CompleteSetupDto = {
      admin: {
        username: 'admin',
        email: 'admin@igreja.org',
        fullName: 'Administrador Geral',
        password: 'S3nh@Forte!',
      },
      congregation: {
        name: 'Igreja Central AIC',
      },
    };
    return { ...dto, ...overrides };
  };

  /**
   * manager.findOne é usado para Role (papel ADMIN), User (unicidade do admin)
   * e Congregation (unicidade de email/document). Despacha por entity.
   */
  const stubFindOne = (results: {
    role?: Role | null;
    user?: User | null;
    congregation?: Congregation | null;
  }): void => {
    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Role) {
        return Promise.resolve(
          results.role === undefined ? adminRole : results.role,
        );
      }
      if (entity === User) {
        return Promise.resolve(results.user ?? null);
      }
      return Promise.resolve(results.congregation ?? null);
    });
  };

  const expectApiError = async (
    promise: Promise<unknown>,
    status: HttpStatus,
    code: string,
  ): Promise<void> => {
    try {
      await promise;
      fail('esperava ApiException');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(status);
      expect((error as ApiException).getResponse()).toMatchObject({ code });
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (bcrypt.hash as jest.Mock).mockResolvedValue(passwordHash);
    usersRepository.count.mockResolvedValue(0);
    dataSource.manager.count.mockResolvedValue(0);
    manager.count.mockResolvedValue(0);
    congregationsService.getOrCreateBase.mockResolvedValue(baseHeadquarters());
    stubFindOne({});
    manager.create.mockImplementation(
      (entity: unknown, value: Record<string, unknown>) =>
        entity === User ? { ...value, id: adminUserId } : value,
    );
    manager.save.mockImplementation((entity: unknown) =>
      Promise.resolve(entity),
    );
    dataSource.transaction.mockImplementation(
      (callback: (entityManager: unknown) => Promise<unknown>) =>
        callback(manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(SetupService);
  });

  describe('getStatus', () => {
    it('deve retornar needsSetup=true quando não há usuários', async () => {
      usersRepository.count.mockResolvedValue(0);

      await expect(service.getStatus()).resolves.toEqual({ needsSetup: true });
    });

    it('deve retornar needsSetup=false quando já existe usuário', async () => {
      usersRepository.count.mockResolvedValue(1);

      await expect(service.getStatus()).resolves.toEqual({ needsSetup: false });
    });
  });

  describe('complete', () => {
    it('deve criar o admin ADMIN active, atualizar a HQ e vincular a membership padrão', async () => {
      const result = await service.complete(completeDto());

      expect(bcrypt.hash).toHaveBeenCalledWith('S3nh@Forte!', 12);
      expect(manager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          username: 'admin',
          email: 'admin@igreja.org',
          fullName: 'Administrador Geral',
          passwordHash,
          status: UserStatus.ACTIVE,
          roles: [adminRole],
        }),
      );
      expect(manager.create).toHaveBeenCalledWith(UserCongregation, {
        userId: adminUserId,
        congregationId: hqId,
        isDefault: true,
      });
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: hqId, name: 'Igreja Central AIC' }),
      );
      expect(result).toEqual({
        needsSetup: false,
        user: {
          id: adminUserId,
          username: 'admin',
          email: 'admin@igreja.org',
          fullName: 'Administrador Geral',
        },
        congregation: {
          id: hqId,
          name: 'Igreja Central AIC',
          type: CongregationType.HEADQUARTERS,
        },
      });
    });

    it('deve resolver a role ADMIN por code, sem depender de id numérico', async () => {
      await service.complete(completeDto());

      expect(manager.findOne).toHaveBeenCalledWith(Role, {
        where: { code: 'ADMIN' },
      });
    });

    it('deve aplicar os campos opcionais informados da congregação', async () => {
      await service.complete(
        completeDto({
          congregation: {
            name: 'Igreja Central AIC',
            tradeName: 'AIC Central',
            document: '12.345.678/0001-99',
            email: 'contato@aic.org',
            phone: '+551133334444',
            address: 'Av. Paulista, 1000',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-100',
            foundationDate: '1990-03-15',
            website: 'https://www.aic.org',
          },
        }),
      );

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: hqId,
          name: 'Igreja Central AIC',
          tradeName: 'AIC Central',
          document: '12.345.678/0001-99',
          email: 'contato@aic.org',
          phone: '+551133334444',
          address: 'Av. Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          foundationDate: '1990-03-15',
          website: 'https://www.aic.org',
        }),
      );
    });

    it('deve preservar os campos existentes da HQ quando os opcionais não são enviados', async () => {
      congregationsService.getOrCreateBase.mockResolvedValue(
        baseHeadquarters({ tradeName: 'AIC Matriz', city: 'Campinas' }),
      );

      await service.complete(completeDto());

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Igreja Central AIC',
          tradeName: 'AIC Matriz',
          city: 'Campinas',
        }),
      );
    });

    it('deve lançar 409 SETUP_ALREADY_COMPLETED quando já existe usuário, sem abrir transação', async () => {
      dataSource.manager.count.mockResolvedValue(1);

      await expectApiError(
        service.complete(completeDto()),
        HttpStatus.CONFLICT,
        ApiErrorCode.SETUP_ALREADY_COMPLETED,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
    });

    it('deve lançar 409 SETUP_ALREADY_COMPLETED quando um POST concorrente cria o usuário antes da transação', async () => {
      manager.count.mockResolvedValue(1);

      await expectApiError(
        service.complete(completeDto()),
        HttpStatus.CONFLICT,
        ApiErrorCode.SETUP_ALREADY_COMPLETED,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('deve lançar 500 SETUP_ADMIN_ROLE_MISSING quando a role ADMIN não existe', async () => {
      stubFindOne({ role: null });

      await expectApiError(
        service.complete(completeDto()),
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.SETUP_ADMIN_ROLE_MISSING,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('deve lançar 409 USERS_USERNAME_IN_USE quando o username já está reservado', async () => {
      const existing = new User();
      existing.id = 'outro-usuario';
      existing.username = 'admin';
      existing.email = 'outro@igreja.org';
      stubFindOne({ user: existing });

      await expectApiError(
        service.complete(completeDto()),
        HttpStatus.CONFLICT,
        ApiErrorCode.USERS_USERNAME_IN_USE,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('deve lançar 409 USERS_EMAIL_IN_USE quando o email já está reservado', async () => {
      const existing = new User();
      existing.id = 'outro-usuario';
      existing.username = 'outro.admin';
      existing.email = 'admin@igreja.org';
      stubFindOne({ user: existing });

      await expectApiError(
        service.complete(completeDto()),
        HttpStatus.CONFLICT,
        ApiErrorCode.USERS_EMAIL_IN_USE,
      );
    });

    it('deve lançar 409 CONGREGATIONS_EMAIL_IN_USE quando o email pertence a outra congregação', async () => {
      stubFindOne({
        congregation: baseHeadquarters({
          id: '11111111-2222-3333-4444-555555555555',
        }),
      });

      await expectApiError(
        service.complete(
          completeDto({
            congregation: {
              name: 'Igreja Central AIC',
              email: 'contato@aic.org',
            },
          }),
        ),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('deve lançar 409 CONGREGATIONS_DOCUMENT_IN_USE quando o document pertence a outra congregação', async () => {
      stubFindOne({
        congregation: baseHeadquarters({
          id: '11111111-2222-3333-4444-555555555555',
        }),
      });

      await expectApiError(
        service.complete(
          completeDto({
            congregation: {
              name: 'Igreja Central AIC',
              document: '12.345.678/0001-99',
            },
          }),
        ),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
      );
    });

    it('deve aceitar email/document que já pertencem à própria HQ', async () => {
      const headquarters = baseHeadquarters({ email: 'contato@aic.org' });
      congregationsService.getOrCreateBase.mockResolvedValue(headquarters);
      stubFindOne({ congregation: headquarters });

      const result = await service.complete(
        completeDto({
          congregation: {
            name: 'Igreja Central AIC',
            email: 'contato@aic.org',
          },
        }),
      );

      expect(result.needsSetup).toBe(false);
    });
  });
});
