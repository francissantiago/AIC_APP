import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from '../../roles/dto/role-response.dto';
import { User } from '../entities/user.entity';
import { UserStatus } from '../enums/user-status.enum';

/**
 * Resposta pública de usuário. NUNCA inclui password_hash nem two_factor_secret.
 */
export class UserResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'joao.silva' })
  username!: string;

  @ApiProperty({ example: 'joao.silva@igreja.org' })
  email!: string;

  @ApiProperty({ example: 'João da Silva' })
  fullName!: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.PENDING })
  status!: UserStatus;

  @ApiProperty({ example: false })
  twoFactorEnabled!: boolean;

  @ApiProperty({ nullable: true, type: Date, example: null })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: RoleResponseDto, isArray: true })
  roles!: RoleResponseDto[];

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['finance:read', 'members:write'],
    description:
      'Códigos de permissão deduplicados de todos os papéis do usuário',
  })
  permissions!: string[];

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.username = user.username;
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.status = user.status;
    dto.twoFactorEnabled = Boolean(user.twoFactorEnabled);
    dto.lastLoginAt = user.lastLoginAt;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.roles = (user.roles ?? []).map((role) =>
      RoleResponseDto.fromEntity(role),
    );
    const permissionCodes = new Set<string>();
    for (const role of user.roles ?? []) {
      for (const permission of role.permissions ?? []) {
        permissionCodes.add(permission.code);
      }
    }
    dto.permissions = Array.from(permissionCodes);
    return dto;
  }
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data!: UserResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
