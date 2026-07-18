import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowed?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: UserResponseDto }>();
    const granted = request.user?.permissions?.some((code) =>
      allowed.includes(code),
    );
    if (!granted) {
      throw new ApiException(HttpStatus.FORBIDDEN, {
        code: ApiErrorCode.AUTH_FORBIDDEN,
        message: ApiErrorMessage[ApiErrorCode.AUTH_FORBIDDEN],
      });
    }
    return true;
  }
}
