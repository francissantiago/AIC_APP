import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CreateBranchDto } from './dto/create-branch.dto';
import {
  CongregationResponseDto,
  PaginatedCongregationsResponseDto,
} from './dto/congregation-response.dto';
import { QueryCongregationsDto } from './dto/query-congregations.dto';
import { UpdateCongregationDto } from './dto/update-congregation.dto';
import { Congregation } from './entities/congregation.entity';
import { CongregationStatus } from './enums/congregation-status.enum';
import { CongregationType } from './enums/congregation-type.enum';

@Injectable()
export class CongregationsService {
  private readonly logger = new Logger(CongregationsService.name);

  constructor(
    @InjectRepository(Congregation)
    private readonly congregationsRepository: Repository<Congregation>,
  ) {}

  async getOrCreateBase(): Promise<Congregation> {
    const headquarters = await this.congregationsRepository.find({
      where: { type: CongregationType.HEADQUARTERS, parentId: IsNull() },
      order: { createdAt: 'ASC', id: 'ASC' },
    });

    if (headquarters.length === 0) {
      const created = this.congregationsRepository.create({
        name: 'Congregação',
        type: CongregationType.HEADQUARTERS,
        status: CongregationStatus.ACTIVE,
        parentId: null,
      });
      const saved = await this.congregationsRepository.save(created);
      this.logger.log(`Congregação-base (HQ) criada: ${saved.id}`);
      return saved;
    }

    if (headquarters.length > 1) {
      // Estado legado inconsistente (não deveria ocorrer após a migration +
      // backfill). NÃO soft-deleta mais as demais — apenas loga e retorna a
      // mais antiga de forma determinística, preservando os dados das
      // demais para resolução manual/administrativa.
      this.logger.warn(
        `Estado inconsistente: ${headquarters.length} HQs ativas encontradas; retornando a mais antiga (${headquarters[0].id}) sem alterar as demais.`,
      );
    }

    return headquarters[0];
  }

  async getBase(
    activeCongregationId?: string,
  ): Promise<CongregationResponseDto> {
    const congregation = activeCongregationId
      ? await this.getNodeOrFail(activeCongregationId)
      : await this.getOrCreateBase();
    return CongregationResponseDto.fromEntity(congregation);
  }

  async updateBase(
    dto: UpdateCongregationDto,
    activeCongregationId?: string,
  ): Promise<CongregationResponseDto> {
    const congregation = activeCongregationId
      ? await this.getNodeOrFail(activeCongregationId)
      : await this.getOrCreateBase();
    return this.updateNode(congregation.id, dto);
  }

  async findAll(
    query: QueryCongregationsDto,
  ): Promise<PaginatedCongregationsResponseDto> {
    const { page, limit, type, status, q } = query;

    const qb = this.congregationsRepository
      .createQueryBuilder('congregation')
      .loadRelationCountAndMap(
        'congregation.branchesCount',
        'congregation.branches',
        'branch',
        (branchQuery) => branchQuery.andWhere('branch.deletedAt IS NULL'),
      )
      .orderBy(
        `CASE WHEN congregation.type = '${CongregationType.HEADQUARTERS}' THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('congregation.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      qb.andWhere('congregation.type = :type', { type });
    }
    if (status) {
      qb.andWhere('congregation.status = :status', { status });
    }
    if (q) {
      qb.andWhere(
        '(congregation.name LIKE :q OR congregation.tradeName LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((congregation) =>
        CongregationResponseDto.fromEntity(congregation, {
          branchesCount: (
            congregation as Congregation & { branchesCount?: number }
          ).branchesCount,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async update(
    id: string,
    dto: UpdateCongregationDto,
  ): Promise<CongregationResponseDto> {
    return this.updateNode(id, dto);
  }

  async getById(id: string): Promise<CongregationResponseDto> {
    const congregation = await this.getNodeOrFail(id);
    if (congregation.type !== CongregationType.HEADQUARTERS) {
      return CongregationResponseDto.fromEntity(congregation);
    }
    const branchesCount = await this.congregationsRepository.count({
      where: { parentId: congregation.id },
    });
    return CongregationResponseDto.fromEntity(congregation, {
      branchesCount,
    });
  }

  async createBranch(dto: CreateBranchDto): Promise<CongregationResponseDto> {
    const parent = dto.parentId
      ? await this.getActiveHeadquartersOrFail(dto.parentId)
      : await this.getOrCreateBase();

    await this.assertEmailDocumentUniqueness(
      dto.email,
      dto.document,
      undefined,
    );

    const branch = this.congregationsRepository.create({
      name: dto.name,
      tradeName: dto.tradeName ?? null,
      type: CongregationType.BRANCH,
      parentId: parent.id,
      document: dto.document ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      zipCode: dto.zipCode ?? null,
      foundationDate: dto.foundationDate ?? null,
      website: dto.website ?? null,
      status: dto.status ?? CongregationStatus.ACTIVE,
      notes: dto.notes ?? null,
    });

    const saved = await this.congregationsRepository.save(branch);
    this.logger.log(`Filial criada: ${saved.id} (parent=${parent.id})`);
    return CongregationResponseDto.fromEntity(saved);
  }

  async removeNode(id: string): Promise<void> {
    const congregation = await this.getNodeOrFail(id);

    if (congregation.type === CongregationType.HEADQUARTERS) {
      const activeBranches = await this.congregationsRepository.count({
        where: { parentId: congregation.id },
      });
      if (activeBranches > 0) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.CONGREGATIONS_HAS_ACTIVE_BRANCHES,
          message:
            ApiErrorMessage[ApiErrorCode.CONGREGATIONS_HAS_ACTIVE_BRANCHES],
        });
      }
    }

    await this.congregationsRepository.softRemove(congregation);
    this.logger.log(`Congregação removida (soft delete): ${id}`);
  }

  private async updateNode(
    id: string,
    dto: UpdateCongregationDto,
  ): Promise<CongregationResponseDto> {
    const congregation = await this.getNodeOrFail(id);

    this.assertTypeUnchanged(congregation, dto.type);

    if (dto.email !== undefined && dto.email !== congregation.email) {
      await this.assertEmailDocumentUniqueness(
        dto.email,
        undefined,
        congregation.id,
      );
      congregation.email = dto.email ?? null;
    }
    if (dto.document !== undefined && dto.document !== congregation.document) {
      await this.assertEmailDocumentUniqueness(
        undefined,
        dto.document,
        congregation.id,
      );
      congregation.document = dto.document ?? null;
    }

    if (dto.name !== undefined) {
      congregation.name = dto.name;
    }
    if (dto.tradeName !== undefined) {
      congregation.tradeName = dto.tradeName ?? null;
    }
    if (dto.phone !== undefined) {
      congregation.phone = dto.phone ?? null;
    }
    if (dto.address !== undefined) {
      congregation.address = dto.address ?? null;
    }
    if (dto.city !== undefined) {
      congregation.city = dto.city ?? null;
    }
    if (dto.state !== undefined) {
      congregation.state = dto.state ?? null;
    }
    if (dto.zipCode !== undefined) {
      congregation.zipCode = dto.zipCode ?? null;
    }
    if (dto.foundationDate !== undefined) {
      congregation.foundationDate = dto.foundationDate ?? null;
    }
    if (dto.website !== undefined) {
      congregation.website = dto.website ?? null;
    }
    if (dto.status !== undefined) {
      congregation.status = dto.status;
    }
    if (dto.notes !== undefined) {
      congregation.notes = dto.notes ?? null;
    }

    const saved = await this.congregationsRepository.save(congregation);
    this.logger.log(`Congregação atualizada: ${saved.id}`);
    return CongregationResponseDto.fromEntity(saved);
  }

  private assertTypeUnchanged(
    congregation: Congregation,
    type: CongregationType | undefined,
  ): void {
    if (type !== undefined && type !== congregation.type) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONGREGATIONS_TYPE_LOCKED,
        message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_TYPE_LOCKED],
        details: [
          {
            field: 'type',
            code: ApiErrorCode.CONGREGATIONS_TYPE_LOCKED,
            message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_TYPE_LOCKED],
          },
        ],
      });
    }
  }

  private async getActiveHeadquartersOrFail(
    parentId: string,
  ): Promise<Congregation> {
    const parent = await this.congregationsRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONGREGATIONS_PARENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_PARENT_NOT_FOUND],
        details: [
          {
            field: 'parentId',
            code: ApiErrorCode.CONGREGATIONS_PARENT_NOT_FOUND,
            message:
              ApiErrorMessage[ApiErrorCode.CONGREGATIONS_PARENT_NOT_FOUND],
          },
        ],
      });
    }
    if (parent.type !== CongregationType.HEADQUARTERS) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CONGREGATIONS_PARENT_MUST_BE_HEADQUARTERS,
        message:
          ApiErrorMessage[
            ApiErrorCode.CONGREGATIONS_PARENT_MUST_BE_HEADQUARTERS
          ],
        details: [
          {
            field: 'parentId',
            code: ApiErrorCode.CONGREGATIONS_PARENT_MUST_BE_HEADQUARTERS,
            message:
              ApiErrorMessage[
                ApiErrorCode.CONGREGATIONS_PARENT_MUST_BE_HEADQUARTERS
              ],
          },
        ],
      });
    }
    return parent;
  }

  private async getNodeOrFail(id: string): Promise<Congregation> {
    const congregation = await this.congregationsRepository.findOne({
      where: { id },
    });
    if (!congregation) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CONGREGATIONS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_NOT_FOUND],
      });
    }
    return congregation;
  }

  private async assertEmailDocumentUniqueness(
    email?: string,
    document?: string,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const conflict = await this.congregationsRepository.findOne({
        where: { email },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE,
          message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE],
          details: [
            {
              field: 'email',
              code: ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE,
              message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE],
            },
          ],
        });
      }
    }
    if (document) {
      const conflict = await this.congregationsRepository.findOne({
        where: { document },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
          message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE],
          details: [
            {
              field: 'document',
              code: ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
              message:
                ApiErrorMessage[ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE],
            },
          ],
        });
      }
    }
  }
}
