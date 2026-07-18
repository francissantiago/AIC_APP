import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { JwtPayload } from './dto/jwt-payload.dto';
import { LoginTwoFactorChallengeDto } from './dto/login-two-factor-challenge.dto';
import { LoginTwoFactorDto } from './dto/login-two-factor.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { TwoFactorSetupResponseDto } from './dto/two-factor-setup-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const BCRYPT_COST = 12;
const PREAUTH_EXPIRES_IN = '5m' as const;
const TOTP_ISSUER = 'AIC';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<AuthResponseDto | LoginTwoFactorChallengeDto> {
    const user = await this.usersService.findByEmailForAuth(dto.email);

    if (!user?.passwordHash) {
      this.logger.warn(
        `Login falhou: email não encontrado (${this.maskEmail(dto.email)})`,
      );
      throw this.invalidCredentials();
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      this.logger.warn(
        `Login falhou: senha inválida (${this.maskEmail(dto.email)})`,
      );
      throw this.invalidCredentials();
    }

    // D2: status ≠ active → 401 genérico (anti-enumeração)
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Login falhou: status ${user.status} (${this.maskEmail(dto.email)})`,
      );
      throw this.invalidCredentials();
    }

    if (user.twoFactorEnabled) {
      const preAuthToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: '2fa' } satisfies JwtPayload,
        { expiresIn: PREAUTH_EXPIRES_IN },
      );
      this.logger.log(`Login 2FA challenge: ${user.id} (${user.username})`);
      return {
        requiresTwoFactor: true,
        preAuthToken,
        expiresIn: PREAUTH_EXPIRES_IN,
      };
    }

    return this.issueSession(user);
  }

  async loginWithTwoFactor(dto: LoginTwoFactorDto): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.preAuthToken);
    } catch {
      throw this.preAuthInvalid();
    }

    if (payload.purpose !== '2fa' || !payload.sub) {
      throw this.preAuthInvalid();
    }

    const user = await this.usersService.findOneForAuthSecrets(payload.sub);

    if (user.status !== UserStatus.ACTIVE || !user.twoFactorEnabled) {
      throw this.preAuthInvalid();
    }

    await this.assertValidTotp(user.twoFactorSecret, dto.code);
    return this.issueSession(user);
  }

  async me(userId: string): Promise<UserResponseDto> {
    return this.usersService.findOne(userId);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserResponseDto> {
    if (dto.fullName === undefined && dto.email === undefined) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_VALIDATION,
        message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
      });
    }
    return this.usersService.updateProfile(userId, {
      fullName: dto.fullName,
      email: dto.email,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findOneForAuthSecrets(userId);
    if (!user.passwordHash) {
      throw this.invalidCurrentPassword();
    }

    const currentOk = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      throw this.invalidCurrentPassword();
    }

    const sameAsCurrent = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (sameAsCurrent) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.AUTH_PASSWORD_SAME_AS_CURRENT,
        message: ApiErrorMessage[ApiErrorCode.AUTH_PASSWORD_SAME_AS_CURRENT],
      });
    }

    const hash = await bcrypt.hash(dto.newPassword, BCRYPT_COST);
    await this.usersService.updatePasswordHash(userId, hash);
  }

  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResponseDto> {
    const user = await this.usersService.findOneForAuthSecrets(userId);

    if (user.twoFactorEnabled) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.AUTH_2FA_ALREADY_ENABLED,
        message: ApiErrorMessage[ApiErrorCode.AUTH_2FA_ALREADY_ENABLED],
      });
    }

    const issuer =
      this.configService.get<string>('TOTP_ISSUER') ??
      this.configService.get<string>('APP_NAME') ??
      TOTP_ISSUER;
    const secret = generateSecret();
    await this.usersService.setTwoFactorSecret(userId, secret);

    const otpauthUrl = generateURI({
      issuer,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    this.logger.log(`2FA setup iniciado: ${userId}`);
    return { otpauthUrl, qrCodeDataUrl, secret };
  }

  async verifyTwoFactor(
    userId: string,
    dto: TwoFactorCodeDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOneForAuthSecrets(userId);

    if (user.twoFactorEnabled) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.AUTH_2FA_ALREADY_ENABLED,
        message: ApiErrorMessage[ApiErrorCode.AUTH_2FA_ALREADY_ENABLED],
      });
    }

    if (!user.twoFactorSecret) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.AUTH_2FA_NOT_PENDING,
        message: ApiErrorMessage[ApiErrorCode.AUTH_2FA_NOT_PENDING],
      });
    }

    await this.assertValidTotp(user.twoFactorSecret, dto.code);
    await this.usersService.setTwoFactorEnabled(userId, true);
    this.logger.log(`2FA habilitado: ${userId}`);
    return this.usersService.findOne(userId);
  }

  async disableTwoFactor(
    userId: string,
    dto: DisableTwoFactorDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOneForAuthSecrets(userId);

    if (!user.twoFactorEnabled) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.AUTH_2FA_NOT_ENABLED,
        message: ApiErrorMessage[ApiErrorCode.AUTH_2FA_NOT_ENABLED],
      });
    }

    if (!user.passwordHash) {
      throw this.invalidCurrentPassword();
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw this.invalidCurrentPassword();
    }

    await this.assertValidTotp(user.twoFactorSecret, dto.code);
    await this.usersService.setTwoFactorSecret(userId, null);
    await this.usersService.setTwoFactorEnabled(userId, false);
    this.logger.log(`2FA desabilitado: ${userId}`);
    return this.usersService.findOne(userId);
  }

  private async issueSession(user: User): Promise<AuthResponseDto> {
    await this.usersService.touchLastLogin(user.id);
    user.lastLoginAt = new Date();

    const roles = (user.roles ?? []).map((role) => role.code);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '8h');
    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Login OK: ${user.id} (${user.username})`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: UserResponseDto.fromEntity(user),
    };
  }

  private async assertValidTotp(
    secret: string | null | undefined,
    code: string,
  ): Promise<void> {
    if (!secret) {
      throw this.invalidTotp();
    }
    const result = await verify({ secret, token: code });
    if (!result.valid) {
      throw this.invalidTotp();
    }
  }

  private invalidCredentials(): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
      message: ApiErrorMessage[ApiErrorCode.AUTH_INVALID_CREDENTIALS],
    });
  }

  private invalidCurrentPassword(): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.AUTH_INVALID_CURRENT_PASSWORD,
      message: ApiErrorMessage[ApiErrorCode.AUTH_INVALID_CURRENT_PASSWORD],
    });
  }

  private invalidTotp(): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.AUTH_2FA_INVALID_CODE,
      message: ApiErrorMessage[ApiErrorCode.AUTH_2FA_INVALID_CODE],
    });
  }

  private preAuthInvalid(): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.AUTH_2FA_PREAUTH_INVALID,
      message: ApiErrorMessage[ApiErrorCode.AUTH_2FA_PREAUTH_INVALID],
    });
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) {
      return '***';
    }
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
