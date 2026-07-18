import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
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
  };
  const rolesRepository = {
    findBy: jest.fn(),
  };

  const memberRole: Role = {
    id: 6,
    code: 'MEMBER',
    name: 'Membro',
    description: 'Acesso básico de membro comum',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
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

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('deve criar usuário com hash bcrypt (cost 12) e não expor campos sensíveis', async () => {
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValue('$2b$12$hash-gerado');
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findBy.mockResolvedValue([memberRole]);
      const saved = baseUser();
      saved.passwordHash = '$2b$12$hash-gerado';
      usersRepository.create.mockReturnValue(saved);
      usersRepository.save.mockResolvedValue(saved);

      const result = await service.create(createDto());

      expect(hashMock).toHaveBeenCalledWith('S3nh@Forte!', 12);
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: '$2b$12$hash-gerado',
          status: UserStatus.PENDING,
          roles: [memberRole],
        }),
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('twoFactorSecret');
      expect(result.username).toBe('joao.silva');
      expect(result.roles).toEqual([
        expect.objectContaining({ id: 6, code: 'MEMBER' }),
      ]);
    });

    it('deve lançar 409 quando username já existe (incluindo soft-deleted)', async () => {
      usersRepository.findOne.mockResolvedValue(baseUser());

      await expect(service.create(createDto())).rejects.toThrow(
        ConflictException,
      );
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar 422 quando alguma role não existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findBy.mockResolvedValue([]);

      await expect(service.create(createDto())).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(usersRepository.save).not.toHaveBeenCalled();
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
      ).rejects.toThrow(ConflictException);
    });

    it('deve atualizar fullName e status', async () => {
      const user = baseUser();
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockImplementation((entity: User) =>
        Promise.resolve(entity),
      );

      const result = await service.update(user.id, {
        fullName: 'João Batista da Silva',
        status: UserStatus.ACTIVE,
      });

      expect(result.fullName).toBe('João Batista da Silva');
      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('setRoles', () => {
    it('deve substituir o conjunto de roles do usuário', async () => {
      const user = baseUser();
      const adminRole: Role = { ...memberRole, id: 1, code: 'ADMIN' };
      usersRepository.findOne.mockResolvedValue(user);
      rolesRepository.findBy.mockResolvedValue([adminRole]);
      usersRepository.save.mockImplementation((entity: User) =>
        Promise.resolve(entity),
      );

      const result = await service.setRoles(user.id, { roleIds: [1] });

      expect(result.roles).toEqual([
        expect.objectContaining({ code: 'ADMIN' }),
      ]);
    });

    it('deve lançar 422 quando roleIds contém role inexistente', async () => {
      usersRepository.findOne.mockResolvedValue(baseUser());
      rolesRepository.findBy.mockResolvedValue([memberRole]);

      await expect(
        service.setRoles(baseUser().id, { roleIds: [6, 999] }),
      ).rejects.toThrow(UnprocessableEntityException);
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
        NotFoundException,
      );
      expect(usersRepository.softRemove).not.toHaveBeenCalled();
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
});
