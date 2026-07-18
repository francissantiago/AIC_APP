import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { UserStatus } from '../../users/enums/user-status.enum';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../dto/jwt-payload.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserResponseDto> {
    if (payload.purpose === '2fa') {
      throw this.invalidCredentials();
    }

    try {
      const user = await this.usersService.findOne(payload.sub);
      if (user.status !== UserStatus.ACTIVE) {
        throw this.invalidCredentials();
      }
      return user;
    } catch (error) {
      if (error instanceof ApiException && error.getStatus() === 401) {
        throw error;
      }
      if (error instanceof HttpException && error.getStatus() === 404) {
        throw this.invalidCredentials();
      }
      throw error;
    }
  }

  private invalidCredentials(): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
      message: ApiErrorMessage[ApiErrorCode.AUTH_INVALID_CREDENTIALS],
    });
  }
}
