import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { UsersService } from '../users/users.service';
import { SetUserCongregationsDto } from './dto/set-user-congregations.dto';
import { UserCongregationResponseDto } from './dto/user-congregation-response.dto';
import { Congregation } from './entities/congregation.entity';
import { UserCongregation } from './entities/user-congregation.entity';
import { CongregationStatus } from './enums/congregation-status.enum';

@Injectable()
export class UserCongregationsService {
  private readonly logger = new Logger(UserCongregationsService.name);

  constructor(
    @InjectRepository(UserCongregation)
    private readonly userCongregationsRepository: Repository<UserCongregation>,
    @InjectRepository(Congregation)
    private readonly congregationsRepository: Repository<Congregation>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async listForUser(userId: string): Promise<UserCongregationResponseDto[]> {
    await this.usersService.findOne(userId);
    const memberships = await this.userCongregationsRepository.find({
      where: { userId },
      relations: { congregation: true },
      order: { isDefault: 'DESC' },
    });
    return memberships
      .filter((membership) => membership.congregation !== null)
      .map((membership) => UserCongregationResponseDto.fromEntity(membership));
  }

  async setForUser(
    userId: string,
    dto: SetUserCongregationsDto,
  ): Promise<UserCongregationResponseDto[]> {
    await this.usersService.findOne(userId);

    if (!dto.congregationIds.includes(dto.defaultCongregationId)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONGREGATIONS_MEMBERSHIP_DEFAULT_REQUIRED,
        message:
          ApiErrorMessage[
            ApiErrorCode.CONGREGATIONS_MEMBERSHIP_DEFAULT_REQUIRED
          ],
        details: [
          {
            field: 'defaultCongregationId',
            code: ApiErrorCode.CONGREGATIONS_MEMBERSHIP_DEFAULT_REQUIRED,
            message:
              ApiErrorMessage[
                ApiErrorCode.CONGREGATIONS_MEMBERSHIP_DEFAULT_REQUIRED
              ],
          },
        ],
      });
    }

    const uniqueIds = [...new Set(dto.congregationIds)];
    const congregations = await this.congregationsRepository.find({
      where: { id: In(uniqueIds) },
    });
    if (congregations.length !== uniqueIds.length) {
      const foundIds = new Set(congregations.map((c) => c.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONGREGATIONS_NOT_FOUND,
        message: `Congregações inexistentes: [${missing.join(', ')}]`,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserCongregation, { userId });
      const rows = uniqueIds.map((congregationId) =>
        manager.create(UserCongregation, {
          userId,
          congregationId,
          isDefault: congregationId === dto.defaultCongregationId,
        }),
      );
      await manager.save(rows);
    });

    this.logger.log(
      `Memberships do usuário ${userId} substituídas: [${uniqueIds.join(', ')}] (default=${dto.defaultCongregationId})`,
    );
    return this.listForUser(userId);
  }

  async isMember(userId: string, congregationId: string): Promise<boolean> {
    const membership = await this.userCongregationsRepository.findOne({
      where: { userId, congregationId },
      relations: { congregation: true },
    });
    if (!membership?.congregation) {
      return false;
    }
    return (
      membership.congregation.status === CongregationStatus.ACTIVE &&
      membership.congregation.deletedAt === null
    );
  }

  /**
   * Resolve a congregação ativa padrão do usuário.
   * Nunca auto-vincula à HQ — ausência de membership válida = 403 (AIC-SEC-001).
   */
  async resolveDefaultForUser(userId: string): Promise<Congregation> {
    const membership = await this.userCongregationsRepository.findOne({
      where: { userId, isDefault: true },
      relations: { congregation: true },
    });
    const defaultCongregation = membership?.congregation;
    if (this.isUsableCongregation(defaultCongregation)) {
      return defaultCongregation;
    }

    const anyMembership = await this.userCongregationsRepository.findOne({
      where: { userId },
      relations: { congregation: true },
      order: { assignedAt: 'ASC' },
    });
    const fallbackCongregation = anyMembership?.congregation;
    if (this.isUsableCongregation(fallbackCongregation)) {
      return fallbackCongregation;
    }

    this.logger.warn(
      `Membership ausente para usuário ${userId}; contexto de congregação negado.`,
    );
    throw new ApiException(HttpStatus.FORBIDDEN, {
      code: ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED,
      message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED],
    });
  }

  private isUsableCongregation(
    congregation: Congregation | null | undefined,
  ): congregation is Congregation {
    return (
      congregation != null &&
      congregation.deletedAt === null &&
      congregation.status === CongregationStatus.ACTIVE
    );
  }
}
