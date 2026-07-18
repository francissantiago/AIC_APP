import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './dto/jwt-payload.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailForAuth(dto.email);

    if (!user?.passwordHash) {
      this.logger.warn(
        `Login falhou: email não encontrado (${this.maskEmail(dto.email)})`,
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      this.logger.warn(
        `Login falhou: senha inválida (${this.maskEmail(dto.email)})`,
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // D2: status ≠ active → 401 genérico (anti-enumeração)
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Login falhou: status ${user.status} (${this.maskEmail(dto.email)})`,
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

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

  async me(userId: string): Promise<UserResponseDto> {
    return this.usersService.findOne(userId);
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
