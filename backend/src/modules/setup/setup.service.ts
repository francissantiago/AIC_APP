import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { UserCongregation } from '../congregations/entities/user-congregation.entity';
import { Role } from '../roles/entities/role.entity';
import { SystemRoleCode } from '../roles/roles.constants';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { CompleteSetupResponseDto } from './dto/complete-setup-response.dto';
import {
  CompleteSetupDto,
  SetupCongregationDto,
} from './dto/complete-setup.dto';
import { SetupStatusResponseDto } from './dto/setup-status-response.dto';

const BCRYPT_COST = 12;
const ADMIN_ROLE_CODE: SystemRoleCode = 'ADMIN';

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly congregationsService: CongregationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Critério canônico de "já configurado": existe pelo menos um usuário,
   * incluindo soft-deleted (AIC-SEC-002 — setup irrevogável).
   */
  async getStatus(): Promise<SetupStatusResponseDto> {
    const users = await this.usersRepository.count({ withDeleted: true });
    return { needsSetup: users === 0 };
  }

  async complete(dto: CompleteSetupDto): Promise<CompleteSetupResponseDto> {
    await this.assertSetupPending(this.dataSource.manager);
    const headquarters = await this.congregationsService.getOrCreateBase();
    const passwordHash = await bcrypt.hash(dto.admin.password, BCRYPT_COST);

    const { user, congregation } = await this.dataSource.transaction(
      async (manager) => {
        // Serializa setups concorrentes (AIC-SEC-011) via lock pessimista na HQ.
        await manager
          .createQueryBuilder(Congregation, 'c')
          .setLock('pessimistic_write')
          .where('c.id = :id', { id: headquarters.id })
          .getOne();
        await this.assertSetupPending(manager);
        const adminRole = await this.resolveAdminRole(manager);
        await this.assertAdminUniqueness(
          manager,
          dto.admin.username,
          dto.admin.email,
        );

        const savedCongregation = await this.applyCongregationData(
          manager,
          headquarters,
          dto.congregation,
        );

        const savedUser = await manager.save(
          manager.create(User, {
            username: dto.admin.username,
            email: dto.admin.email,
            fullName: dto.admin.fullName,
            passwordHash,
            status: UserStatus.ACTIVE,
            roles: [adminRole],
          }),
        );

        await manager.save(
          manager.create(UserCongregation, {
            userId: savedUser.id,
            congregationId: savedCongregation.id,
            isDefault: true,
          }),
        );

        return { user: savedUser, congregation: savedCongregation };
      },
    );

    this.logger.log(
      `Configuração inicial concluída: admin ${user.id} (${user.username}) vinculado à HQ ${congregation.id}`,
    );
    return CompleteSetupResponseDto.fromEntities(user, congregation);
  }

  private async assertSetupPending(manager: EntityManager): Promise<void> {
    const users = await manager.count(User, { withDeleted: true });
    if (users > 0) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SETUP_ALREADY_COMPLETED,
        message: ApiErrorMessage[ApiErrorCode.SETUP_ALREADY_COMPLETED],
      });
    }
  }

  private async resolveAdminRole(manager: EntityManager): Promise<Role> {
    const role = await manager.findOne(Role, {
      where: { code: ADMIN_ROLE_CODE },
    });
    if (!role) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, {
        code: ApiErrorCode.SETUP_ADMIN_ROLE_MISSING,
        message: ApiErrorMessage[ApiErrorCode.SETUP_ADMIN_ROLE_MISSING],
      });
    }
    return role;
  }

  /** Unicidade considera registros soft-deleted, igual a UsersService.create. */
  private async assertAdminUniqueness(
    manager: EntityManager,
    username: string,
    email: string,
  ): Promise<void> {
    const conflict = await manager.findOne(User, {
      where: [{ username }, { email }],
      withDeleted: true,
    });
    if (!conflict) {
      return;
    }
    const isUsername = conflict.username === username;
    const code = isUsername
      ? ApiErrorCode.USERS_USERNAME_IN_USE
      : ApiErrorCode.USERS_EMAIL_IN_USE;
    throw new ApiException(HttpStatus.CONFLICT, {
      code,
      message: ApiErrorMessage[code],
      details: [
        {
          field: isUsername ? 'admin.username' : 'admin.email',
          code,
          message: ApiErrorMessage[code],
        },
      ],
    });
  }

  private async applyCongregationData(
    manager: EntityManager,
    headquarters: Congregation,
    dto: SetupCongregationDto,
  ): Promise<Congregation> {
    await this.assertCongregationUniqueness(manager, dto, headquarters.id);

    headquarters.name = dto.name;
    if (dto.tradeName !== undefined) {
      headquarters.tradeName = dto.tradeName;
    }
    if (dto.document !== undefined) {
      headquarters.document = dto.document;
    }
    if (dto.email !== undefined) {
      headquarters.email = dto.email;
    }
    if (dto.phone !== undefined) {
      headquarters.phone = dto.phone;
    }
    if (dto.address !== undefined) {
      headquarters.address = dto.address;
    }
    if (dto.city !== undefined) {
      headquarters.city = dto.city;
    }
    if (dto.state !== undefined) {
      headquarters.state = dto.state;
    }
    if (dto.zipCode !== undefined) {
      headquarters.zipCode = dto.zipCode;
    }
    if (dto.foundationDate !== undefined) {
      headquarters.foundationDate = dto.foundationDate;
    }
    if (dto.website !== undefined) {
      headquarters.website = dto.website;
    }

    return manager.save(headquarters);
  }

  private async assertCongregationUniqueness(
    manager: EntityManager,
    dto: SetupCongregationDto,
    headquartersId: string,
  ): Promise<void> {
    if (dto.email) {
      const conflict = await manager.findOne(Congregation, {
        where: { email: dto.email },
        withDeleted: true,
      });
      if (conflict && conflict.id !== headquartersId) {
        this.throwCongregationConflict(
          ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE,
          'congregation.email',
        );
      }
    }
    if (dto.document) {
      const conflict = await manager.findOne(Congregation, {
        where: { document: dto.document },
        withDeleted: true,
      });
      if (conflict && conflict.id !== headquartersId) {
        this.throwCongregationConflict(
          ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
          'congregation.document',
        );
      }
    }
  }

  private throwCongregationConflict(
    code:
      | typeof ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE
      | typeof ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
    field: string,
  ): never {
    throw new ApiException(HttpStatus.CONFLICT, {
      code,
      message: ApiErrorMessage[code],
      details: [{ field, code, message: ApiErrorMessage[code] }],
    });
  }
}
