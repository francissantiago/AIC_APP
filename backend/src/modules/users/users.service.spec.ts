import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { MembersService } from '../members/members.service';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UserStatus } from './enums/user-status.enum';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };
  const rolesRepository = {
    find: jest.fn(),
  };
  const membersService = {
    findMemberLinkByUserId: jest.fn(),
    findMemberLinksByUserIds: jest.fn(),
    linkUserToMember: jest.fn(),
    unlinkUserFromMember: jest.fn(),
  };
  const transactionManager = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const membersReadPermission = {
    id: 5,
    code: 'members:read',
    resource: 'members',
    action: 'read',
    description: 'Visualizar membros da congregação',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
  };

  const membersWritePermission = {
    ...membersReadPermission,
    id: 6,
    code: 'members:write',
    action: 'write',
  };

  const memberRole: Role = {
    id: 6,
    code: 'MEMBER',
    name: 'Membro',
    description: 'Acesso básico de membro comum',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
    permissions: [membersReadPermission, membersWritePermission],
  };

  const baseUser = (): User => {
    const user = new User();
    user.id = '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f';
    user.username = 'joao.silva';
    user.email = 'joao.silva@igreja.org';
    user.fullName = 'João da Silva';
    user.passwordHash = '$2b$12$hash-existente';
    user.status = UserStatus.PENDING;
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.lastLoginAt = null;
    user.tokenVersion = 0;
    user.createdAt = new Date('2026-07-17T00:00:00Z');
    user.updatedAt = new Date('2026-07-17T00:00:00Z');
    user.deletedAt = null;
    user.roles = [memberRole];
    return user;
  };

  const createDto = (): CreateUserDto => ({
    username: 'joao.silva',
    email: 'joao.silva@igreja.org',
    fullName: 'João da Silva',
    password: 'S3nh@Forte!',
    roleIds: [6],
  });

  const actorSecretary = (): UserResponseDto => ({
    id: 'actor-1111-2222-3333-444444444444',
    username: 'secretario',
    email: 'secretario@igreja.org',
    fullName: 'Secretário',
    status: UserStatus.ACTIVE,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
    roles: [
      {
        id: 4,
        code: 'SECRETARY',
        name: 'Secretário',
        description: null,
        isSystem: true,
        permissions: [],
      },
    ],
    permissions: ['users:write', 'members:read', 'members:write'],
  });

  const actorAdmin = (): UserResponseDto => ({
    ...actorSecretary(),
    id: 'admin-1111-2222-3333-444444444444',
    username: 'admin',
    email: 'admin@igreja.org',
    fullName: 'Admin',
    roles: [
      {
        id: 1,
        code: 'ADMIN',
        name: 'Administrador',
        description: null,
        isSystem: true,
        permissions: [],
      },
    ],
    permissions: [
      'users:write',
      'roles:write',
      'members:read',
      'members:write',
    ],
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    usersRepository.manager = {
      transaction: jest.fn(
        (cb: (m: typeof transactionManager) => Promise<unknown>) =>
          cb(transactionManager),
      ),
    };
    membersService.findMemberLinkByUserId.mockResolvedValue(null);
    membersService.findMemberLinksByUserIds.mockResolvedValue(new Map());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: MembersService, useValue: membersService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('deve criar usuário com hash bcrypt (cost 12) e não expor campos sensíveis', async () => {
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValue('$2b$12$hash-gerado');
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.find.mockResolvedValue([memberRole]);
      const saved = baseUser();
      saved.passwordHash = '$2b$12$hash-gerado';
      transactionManager.create.mockReturnValue(saved);
      transactionManager.save.mockResolvedValue(saved);

      const result = await service.create(createDto(), actorAdmin());

      expect(hashMock).toHaveBeenCalledWith('S3nh@Forte!', 12);
      expect(transactionManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          passwordHash: '$2b$12$hash-gerado',
          status: UserStatus.PENDING,
          roles: [memberRole],
        }),
      );
      expect(membersService.linkUserToMember).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('twoFactorSecret');
      expect(result.username).toBe('joao.silva');
      expect(result.roles).toEqual([
        expect.objectContaining({ id: 6, code: 'MEMBER' }),
      ]);
    });

    it('deve lançar 409 quando username já existe (incluindo soft-deleted)', async () => {
      usersRepository.findOne.mockResolvedValue(baseUser());

      await expect(service.create(createDto(), actorAdmin())).rejects.toThrow(
        ApiException,
      );
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('deve vincular membro quando memberId é informado na criação', async () => {
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValue('$2b$12$hash-gerado');
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.find.mockResolvedValue([memberRole]);
      const saved = baseUser();
      transactionManager.create.mockReturnValue(saved);
      transactionManager.save.mockResolvedValue(saved);
      membersService.findMemberLinkByUserId.mockResolvedValue({
        memberId: 'member-1111-2222-3333-444444444444',
        memberFullName: 'João da Silva',
      });

      const memberId = 'member-1111-2222-3333-444444444444';
      const result = await service.create(
        { ...createDto(), memberId },
        actorAdmin(),
        'cong-123',
      );

      expect(membersService.linkUserToMember).toHaveBeenCalledWith(
        saved.id,
        memberId,
        'cong-123',
        transactionManager,
      );
      expect(result.memberId).toBe(memberId);
      expect(result.memberFullName).toBe('João da Silva');
    });

    it('deve lançar 422 quando alguma role não existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.find.mockResolvedValue([]);

      await expect(service.create(createDto(), actorAdmin())).rejects.toThrow(
        ApiException,
      );
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('deve negar SECRETARY atribuindo papel ADMIN na criação (AIC-SEC-003)', async () => {
      const adminRole: Role = {
        ...memberRole,
        id: 1,
        code: 'ADMIN',
        permissions: [],
      };
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.find.mockResolvedValue([adminRole]);

      try {
        await service.create(
          { ...createDto(), roleIds: [1] },
          actorSecretary(),
        );
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.AUTH_FORBIDDEN,
        });
      }
      expect(transactionManager.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve lançar 409 quando o novo email pertence a outro usuário', async () => {
      const user = baseUser();
      const otherUser = baseUser();
      otherUser.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      usersRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(otherUser);

      await expect(
        service.update(user.id, { email: 'outro@igreja.org' }),
      ).rejects.toThrow(ApiException);
    });

    it('deve atualizar fullName e status', async () => {
      const user = baseUser();
      usersRepository.findOne.mockResolvedValue(user);
      transactionManager.save.mockImplementation((entity: User) =>
        Promise.resolve(entity),
      );

      const result = await service.update(user.id, {
        fullName: 'João Batista da Silva',
        status: UserStatus.ACTIVE,
      });

      expect(result.fullName).toBe('João Batista da Silva');
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('deve desvincular membro quando memberId é null', async () => {
      const user = baseUser();
      usersRepository.findOne.mockResolvedValue(user);
      transactionManager.save.mockImplementation((entity: User) =>
        Promise.resolve(entity),
      );

      await service.update(user.id, { memberId: null });

      expect(membersService.unlinkUserFromMember).toHaveBeenCalledWith(
        user.id,
        transactionManager,
      );
    });
  });

  describe('setRoles', () => {
    it('deve permitir ADMIN substituir roles incluindo ADMIN', async () => {
      const user = baseUser();
      const adminRole: Role = {
        ...memberRole,
        id: 1,
        code: 'ADMIN',
        permissions: [],
      };
      usersRepository.findOne.mockResolvedValue(user);
      rolesRepository.find.mockResolvedValue([adminRole]);
      usersRepository.save.mockImplementation((entity: User) =>
        Promise.resolve(entity),
      );

      const result = await service.setRoles(
        user.id,
        { roleIds: [1] },
        actorAdmin(),
      );

      expect(result.roles).toEqual([
        expect.objectContaining({ code: 'ADMIN' }),
      ]);
    });

    it('deve negar SECRETARY atribuindo papel ADMIN (AIC-SEC-003)', async () => {
      const user = baseUser();
      const adminRole: Role = {
        ...memberRole,
        id: 1,
        code: 'ADMIN',
        permissions: [],
      };
      usersRepository.findOne.mockResolvedValue(user);
      rolesRepository.find.mockResolvedValue([adminRole]);

      try {
        await service.setRoles(user.id, { roleIds: [1] }, actorSecretary());
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.AUTH_FORBIDDEN,
        });
      }
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('deve negar SECRETARY atribuindo role com permissão fora do seu conjunto', async () => {
      const user = baseUser();
      const treasurerRole: Role = {
        ...memberRole,
        id: 3,
        code: 'TREASURER',
        permissions: [
          {
            id: 10,
            code: 'finance:write',
            resource: 'finance',
            action: 'write',
            description: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      usersRepository.findOne.mockResolvedValue(user);
      rolesRepository.find.mockResolvedValue([treasurerRole]);

      await expect(
        service.setRoles(user.id, { roleIds: [3] }, actorSecretary()),
      ).rejects.toThrow(ApiException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar 422 quando roleIds contém role inexistente', async () => {
      usersRepository.findOne.mockResolvedValue(baseUser());
      rolesRepository.find.mockResolvedValue([memberRole]);

      await expect(
        service.setRoles(baseUser().id, { roleIds: [6, 999] }, actorAdmin()),
      ).rejects.toThrow(ApiException);
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete via softRemove', async () => {
      const user = baseUser();
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.softRemove.mockResolvedValue(user);

      await service.remove(user.id);

      expect(usersRepository.softRemove).toHaveBeenCalledWith(user);
    });

    it('deve lançar 404 quando o usuário não existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('id-inexistente')).rejects.toThrow(
        ApiException,
      );
      expect(usersRepository.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('permissions (UserResponseDto.fromEntity)', () => {
    it('deve deduplicar permissions de múltiplos papéis do mesmo usuário', async () => {
      const adminRoleWithOverlap: Role = {
        id: 1,
        code: 'ADMIN',
        name: 'Administrador',
        description: 'Acesso total ao sistema',
        createdAt: new Date('2026-07-17T00:00:00Z'),
        updatedAt: new Date('2026-07-17T00:00:00Z'),
        permissions: [membersReadPermission, membersWritePermission],
      };
      const user = baseUser();
      user.roles = [memberRole, adminRoleWithOverlap];
      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(user.id);

      expect(result.permissions).toEqual(
        expect.arrayContaining(['members:read', 'members:write']),
      );
      expect(result.permissions).toHaveLength(2);
    });

    it('deve retornar permissions vazio quando o usuário não tem papéis com permissões', async () => {
      const user = baseUser();
      user.roles = [];
      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(user.id);

      expect(result.permissions).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('deve paginar e aplicar filtros de status, roleCode e busca', async () => {
      const user = baseUser();
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[user], 1]),
      };
      usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({
        page: 2,
        limit: 10,
        status: UserStatus.PENDING,
        roleCode: 'MEMBER',
        q: 'silva',
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.data[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('tokenVersion (AIC-SEC-009)', () => {
    it('incrementTokenVersion deve chamar repository.increment', async () => {
      usersRepository.increment.mockResolvedValue({ affected: 1 });
      await service.incrementTokenVersion('uid');
      expect(usersRepository.increment).toHaveBeenCalledWith(
        { id: 'uid' },
        'tokenVersion',
        1,
      );
    });

    it('findOneForJwtValidation deve rejeitar tv divergente', async () => {
      const user = baseUser();
      user.tokenVersion = 2;
      usersRepository.findOne.mockResolvedValue(user);

      await expect(
        service.findOneForJwtValidation(user.id, 0),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: { code: ApiErrorCode.AUTH_INVALID_CREDENTIALS },
      });
    });

    it('findOneForJwtValidation deve aceitar tv alinhado (payload antigo = 0)', async () => {
      const user = baseUser();
      user.tokenVersion = 0;
      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.findOneForJwtValidation(user.id, undefined);
      expect(result.id).toBe(user.id);
    });
  });
});
