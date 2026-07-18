import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../../../common/errors/api.exception';
import { RoleResponseDto } from '../../roles/dto/role-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const user = {
    roles: [{ code: 'PASTOR' } as RoleResponseDto],
  } as UserResponseDto;

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;

  it('permite usuário com ao menos um perfil autorizado', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'PASTOR']),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });

  it('retorna 403 quando o perfil não é autorizado', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'TREASURER']),
    } as unknown as Reflector;

    expect(() => new RolesGuard(reflector).canActivate(context)).toThrow(
      ApiException,
    );
  });

  it('não interfere em handlers sem metadado de roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(context)).toBe(true);
  });
});
