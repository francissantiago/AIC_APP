import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmailForAuth: jest.fn(),
    touchLastLogin: jest.fn(),
    findOne: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  const adminRole: Role = {
    id: 1,
    code: 'ADMIN',
    name: 'Administrador',
    description: null,
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
  };

  const baseUser = (status: UserStatus = UserStatus.ACTIVE): User => {
    const user = new User();
    user.id = '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f';
    user.username = 'admin';
    user.email = 'admin@admin.com';
    user.fullName = 'Administrador';
    user.passwordHash = '$2b$12$hash-existente';
    user.status = status;
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.lastLoginAt = null;
    user.createdAt = new Date('2026-07-17T00:00:00Z');
    user.updatedAt = new Date('2026-07-17T00:00:00Z');
    user.deletedAt = null;
    user.roles = [adminRole];
    return user;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('8h');
    jwtService.signAsync.mockResolvedValue('jwt-token-fake');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('deve autenticar usuário active e retornar JWT + user sem campos sensíveis', async () => {
      const user = baseUser();
      usersService.findByEmailForAuth.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersService.touchLastLogin.mockResolvedValue(undefined);

      const result = await service.login({
        email: 'admin@admin.com',
        password: 'S3nh@Forte!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'S3nh@Forte!',
        '$2b$12$hash-existente',
      );
      expect(usersService.touchLastLogin).toHaveBeenCalledWith(user.id);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        username: user.username,
        roles: ['ADMIN'],
      });
      expect(result.accessToken).toBe('jwt-token-fake');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe('8h');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('twoFactorSecret');
      expect(result.user.email).toBe('admin@admin.com');
    });

    it('deve retornar 401 genérico quando email não existe', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nao@existe.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('deve retornar 401 genérico quando senha é inválida', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@admin.com', password: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.touchLastLogin).not.toHaveBeenCalled();
    });

    it('deve retornar 401 genérico quando status ≠ active (anti-enumeração)', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(
        baseUser(UserStatus.PENDING),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'admin@admin.com', password: 'S3nh@Forte!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.touchLastLogin).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('deve retornar 401 genérico para usuário soft-deleted (findByEmail retorna null)', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        service.login({ email: 'admin@admin.com', password: 'S3nh@Forte!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
