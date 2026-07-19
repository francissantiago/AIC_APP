import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { UserCongregationsService } from '../congregations/user-congregations.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmailForAuth: jest.fn(),
    findOneForAuthSecrets: jest.fn(),
    touchLastLogin: jest.fn(),
    findOne: jest.fn(),
    updateProfile: jest.fn(),
    updatePasswordHash: jest.fn(),
    setTwoFactorSecret: jest.fn(),
    setTwoFactorEnabled: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const userCongregationsService = {
    resolveDefaultForUser: jest.fn(),
  };

  const defaultCongregationId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

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
    configService.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'JWT_EXPIRES_IN') {
        return '8h';
      }
      return fallback;
    });
    jwtService.signAsync.mockResolvedValue('jwt-token-fake');
    userCongregationsService.resolveDefaultForUser.mockResolvedValue({
      id: defaultCongregationId,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        {
          provide: UserCongregationsService,
          useValue: userCongregationsService,
        },
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
        defaultCongregationId,
      });
      expect(result).toMatchObject({
        accessToken: 'jwt-token-fake',
        tokenType: 'Bearer',
        expiresIn: '8h',
      });
      if ('user' in result) {
        expect(result.user).not.toHaveProperty('passwordHash');
        expect(result.user).not.toHaveProperty('twoFactorSecret');
        expect(result.user.email).toBe('admin@admin.com');
      }
    });

    it('deve retornar challenge 2FA sem touchLastLogin nem JWT de sessão', async () => {
      const user = baseUser();
      user.twoFactorEnabled = true;
      usersService.findByEmailForAuth.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('preauth-token');

      const result = await service.login({
        email: 'admin@admin.com',
        password: 'S3nh@Forte!',
      });

      expect(usersService.touchLastLogin).not.toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id, purpose: '2fa' },
        { expiresIn: '5m' },
      );
      expect(result).toEqual({
        requiresTwoFactor: true,
        preAuthToken: 'preauth-token',
        expiresIn: '5m',
      });
    });

    it('deve retornar 401 genérico quando email não existe', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nao@existe.com', password: 'x' }),
      ).rejects.toThrow(ApiException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('deve retornar 401 genérico quando senha é inválida', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@admin.com', password: 'errada' }),
      ).rejects.toThrow(ApiException);
      expect(usersService.touchLastLogin).not.toHaveBeenCalled();
    });

    it('deve retornar 401 genérico quando status ≠ active (anti-enumeração)', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(
        baseUser(UserStatus.PENDING),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'admin@admin.com', password: 'S3nh@Forte!' }),
      ).rejects.toThrow(ApiException);
      expect(usersService.touchLastLogin).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('deve retornar 401 genérico para usuário soft-deleted (findByEmail retorna null)', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(
        service.login({ email: 'admin@admin.com', password: 'S3nh@Forte!' }),
      ).rejects.toThrow(ApiException);
    });
  });

  describe('loginWithTwoFactor', () => {
    it('deve emitir sessão após TOTP válido', async () => {
      const user = baseUser();
      user.twoFactorEnabled = true;
      user.twoFactorSecret = 'SECRET';
      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        purpose: '2fa',
      });
      usersService.findOneForAuthSecrets.mockResolvedValue(user);
      (verify as jest.Mock).mockResolvedValue({ valid: true });
      usersService.touchLastLogin.mockResolvedValue(undefined);

      const result = await service.loginWithTwoFactor({
        preAuthToken: 'preauth',
        code: '123456',
      });

      expect(usersService.touchLastLogin).toHaveBeenCalledWith(user.id);
      expect(result.accessToken).toBe('jwt-token-fake');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        username: user.username,
        roles: ['ADMIN'],
        defaultCongregationId,
      });
    });

    it('deve rejeitar código TOTP inválido', async () => {
      const user = baseUser();
      user.twoFactorEnabled = true;
      user.twoFactorSecret = 'SECRET';
      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        purpose: '2fa',
      });
      usersService.findOneForAuthSecrets.mockResolvedValue(user);
      (verify as jest.Mock).mockResolvedValue({ valid: false });

      let caught: unknown;
      try {
        await service.loginWithTwoFactor({
          preAuthToken: 'preauth',
          code: '000000',
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ApiException);
      expect(
        ((caught as ApiException).getResponse() as { code: string }).code,
      ).toBe(ApiErrorCode.AUTH_2FA_INVALID_CODE);
      expect(usersService.touchLastLogin).not.toHaveBeenCalled();
    });

    it('deve rejeitar preAuthToken inválido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      let caught: unknown;
      try {
        await service.loginWithTwoFactor({
          preAuthToken: 'expired',
          code: '123456',
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ApiException);
      expect(
        ((caught as ApiException).getResponse() as { code: string }).code,
      ).toBe(ApiErrorCode.AUTH_2FA_PREAUTH_INVALID);
    });
  });

  describe('changePassword', () => {
    it('deve rejeitar senha atual inválida', async () => {
      usersService.findOneForAuthSecrets.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let caught: unknown;
      try {
        await service.changePassword('uid', {
          currentPassword: 'errada',
          newPassword: 'NovaSenh@1',
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ApiException);
      expect(
        ((caught as ApiException).getResponse() as { code: string }).code,
      ).toBe(ApiErrorCode.AUTH_INVALID_CURRENT_PASSWORD);
    });

    it('deve rejeitar nova senha igual à atual', async () => {
      usersService.findOneForAuthSecrets.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      let caught: unknown;
      try {
        await service.changePassword('uid', {
          currentPassword: 'S3nh@Forte!',
          newPassword: 'S3nh@Forte!',
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ApiException);
      expect(
        ((caught as ApiException).getResponse() as { code: string }).code,
      ).toBe(ApiErrorCode.AUTH_PASSWORD_SAME_AS_CURRENT);
    });

    it('deve atualizar hash com sucesso', async () => {
      usersService.findOneForAuthSecrets.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$novo-hash');
      usersService.updatePasswordHash.mockResolvedValue(undefined);

      await service.changePassword('uid', {
        currentPassword: 'S3nh@Forte!',
        newPassword: 'NovaSenh@1',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('NovaSenh@1', 12);
      expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
        'uid',
        '$2b$12$novo-hash',
      );
    });
  });

  describe('2FA enroll/disable', () => {
    it('setupTwoFactor deve persistir secret e retornar QR', async () => {
      const user = baseUser();
      usersService.findOneForAuthSecrets.mockResolvedValue(user);
      (generateSecret as jest.Mock).mockReturnValue('NEWSECRET');
      (generateURI as jest.Mock).mockReturnValue('otpauth://totp/AIC:admin');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(
        'data:image/png;base64,abc',
      );
      usersService.setTwoFactorSecret.mockResolvedValue(undefined);

      const result = await service.setupTwoFactor(user.id);

      expect(usersService.setTwoFactorSecret).toHaveBeenCalledWith(
        user.id,
        'NEWSECRET',
      );
      expect(result).toEqual({
        otpauthUrl: 'otpauth://totp/AIC:admin',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        secret: 'NEWSECRET',
      });
    });

    it('verifyTwoFactor deve ativar 2FA com código válido', async () => {
      const user = baseUser();
      user.twoFactorSecret = 'SECRET';
      usersService.findOneForAuthSecrets.mockResolvedValue(user);
      (verify as jest.Mock).mockResolvedValue({ valid: true });
      usersService.setTwoFactorEnabled.mockResolvedValue(undefined);
      usersService.findOne.mockResolvedValue({
        id: user.id,
        twoFactorEnabled: true,
      });

      const result = await service.verifyTwoFactor(user.id, { code: '123456' });

      expect(usersService.setTwoFactorEnabled).toHaveBeenCalledWith(
        user.id,
        true,
      );
      expect(result.twoFactorEnabled).toBe(true);
    });

    it('disableTwoFactor deve limpar secret com senha e TOTP válidos', async () => {
      const user = baseUser();
      user.twoFactorEnabled = true;
      user.twoFactorSecret = 'SECRET';
      usersService.findOneForAuthSecrets.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (verify as jest.Mock).mockResolvedValue({ valid: true });
      usersService.setTwoFactorSecret.mockResolvedValue(undefined);
      usersService.setTwoFactorEnabled.mockResolvedValue(undefined);
      usersService.findOne.mockResolvedValue({
        id: user.id,
        twoFactorEnabled: false,
      });

      const result = await service.disableTwoFactor(user.id, {
        password: 'S3nh@Forte!',
        code: '123456',
      });

      expect(usersService.setTwoFactorSecret).toHaveBeenCalledWith(
        user.id,
        null,
      );
      expect(usersService.setTwoFactorEnabled).toHaveBeenCalledWith(
        user.id,
        false,
      );
      expect(result.twoFactorEnabled).toBe(false);
    });
  });
});
