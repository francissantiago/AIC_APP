import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: UserResponseDto }>();
    const granted = request.user?.roles.some((role) =>
      allowedRoles.includes(role.code),
    );
    if (!granted) {
      throw new ForbiddenException('Perfil sem permissão para esta operação');
    }
    return true;
  }
}
