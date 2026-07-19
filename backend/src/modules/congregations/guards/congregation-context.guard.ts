import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { UserCongregationsService } from '../user-congregations.service';

interface RequestWithCongregationContext {
  user?: UserResponseDto;
  headers: Record<string, string | string[] | undefined>;
  activeCongregationId?: string;
}

const CONGREGATION_HEADER = 'x-congregation-id';

@Injectable()
export class CongregationContextGuard implements CanActivate {
  constructor(
    private readonly userCongregationsService: UserCongregationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCongregationContext>();

    const userId = request.user?.id;
    if (!userId) {
      return true;
    }

    const rawHeader = request.headers[CONGREGATION_HEADER];
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (headerValue) {
      const isValid = await this.userCongregationsService.isMember(
        userId,
        headerValue,
      );
      if (!isValid) {
        throw new ApiException(HttpStatus.FORBIDDEN, {
          code: ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED,
          message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED],
        });
      }
      request.activeCongregationId = headerValue;
      return true;
    }

    const resolved =
      await this.userCongregationsService.resolveDefaultForUser(userId);
    request.activeCongregationId = resolved.id;
    return true;
  }
}
