import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { CreateMissionFieldDto } from './dto/create-mission-field.dto';
import {
  MissionFieldResponseDto,
  PaginatedMissionFieldsResponseDto,
} from './dto/mission-field-response.dto';
import { QueryMissionFieldsDto } from './dto/query-mission-fields.dto';
import { UpdateMissionFieldDto } from './dto/update-mission-field.dto';
import { MissionField } from './entities/mission-field.entity';
import { MissionFieldStatus } from './enums/mission-field-status.enum';

@Injectable()
export class MissionFieldsService {
  private readonly logger = new Logger(MissionFieldsService.name);

  constructor(
    @InjectRepository(MissionField)
    private readonly missionFieldsRepository: Repository<MissionField>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(
    dto: CreateMissionFieldDto,
    activeCongregationId?: string,
  ): Promise<MissionFieldResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const name = dto.name.trim();
    await this.assertNameAvailable(congregationId, name);

    let coordinatorMemberId: string | null = null;
    if (dto.coordinatorMemberId) {
      await this.assertCoordinatorEligible(
        dto.coordinatorMemberId,
        congregationId,
      );
      coordinatorMemberId = dto.coordinatorMemberId;
    }

    const field = this.missionFieldsRepository.create({
      congregationId,
      name,
      country: dto.country.trim(),
      city: this.nullableText(dto.city),
      region: this.nullableText(dto.region),
      description: this.nullableText(dto.description),
      coordinatorMemberId,
      status: dto.status ?? MissionFieldStatus.ACTIVE,
    });
    const saved = await this.missionFieldsRepository.save(field);

    this.logger.log(`Campo missionário criado: ${saved.id} (${saved.name})`);
    return MissionFieldResponseDto.fromEntity(
      await this.getFieldOrFail(saved.id, true, activeCongregationId),
    );
  }

  async findAll(
    query: QueryMissionFieldsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedMissionFieldsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status, country } = query;

    const qb = this.missionFieldsRepository
      .createQueryBuilder('field')
      .leftJoinAndSelect('field.coordinatorMember', 'coordinatorMember')
      .loadRelationCountAndMap('field.assignmentsCount', 'field.assignments')
      .where('field.congregationId = :congregationId', { congregationId })
      .orderBy('field.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('field.status = :status', { status });
    }
    if (country) {
      qb.andWhere('field.country LIKE :country', { country: `%${country}%` });
    }
    if (q) {
      qb.andWhere(
        '(field.name LIKE :q OR field.country LIKE :q OR field.city LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const [fields, total] = await qb.getManyAndCount();
    return {
      data: fields.map((field) =>
        MissionFieldResponseDto.fromEntity(field, {
          assignmentsCount: (
            field as MissionField & { assignmentsCount?: number }
          ).assignmentsCount,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<MissionFieldResponseDto> {
    const field = await this.getFieldOrFail(id, true, activeCongregationId);
    return MissionFieldResponseDto.fromEntity(field);
  }

  async update(
    id: string,
    dto: UpdateMissionFieldDto,
    activeCongregationId?: string,
  ): Promise<MissionFieldResponseDto> {
    const field = await this.getFieldOrFail(id, true, activeCongregationId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== field.name) {
        await this.assertNameAvailable(field.congregationId, name, id);
      }
      field.name = name;
    }
    if (dto.country !== undefined) {
      field.country = dto.country.trim();
    }
    if (dto.city !== undefined) {
      field.city = this.nullableText(dto.city);
    }
    if (dto.region !== undefined) {
      field.region = this.nullableText(dto.region);
    }
    if (dto.description !== undefined) {
      field.description = this.nullableText(dto.description);
    }
    if (dto.status !== undefined) {
      field.status = dto.status;
    }
    if (dto.coordinatorMemberId !== undefined) {
      if (dto.coordinatorMemberId === null || dto.coordinatorMemberId === '') {
        field.coordinatorMemberId = null;
      } else {
        await this.assertCoordinatorEligible(
          dto.coordinatorMemberId,
          field.congregationId,
        );
        field.coordinatorMemberId = dto.coordinatorMemberId;
      }
    }

    const saved = await this.missionFieldsRepository.save(field);
    this.logger.log(`Campo missionário atualizado: ${saved.id}`);
    return MissionFieldResponseDto.fromEntity(
      await this.getFieldOrFail(saved.id, true, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const field = await this.getFieldOrFail(id, true, activeCongregationId);
    await this.missionFieldsRepository.softRemove(field);
    this.logger.log(`Campo missionário removido (soft delete): ${id}`);
  }

  async getFieldOrFailInternal(
    id: string,
    congregationId: string,
  ): Promise<MissionField> {
    const field = await this.missionFieldsRepository.findOne({
      where: { id, congregationId },
    });
    if (!field) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_FIELD_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_FIELD_NOT_FOUND],
      });
    }
    return field;
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getFieldOrFail(
    id: string,
    withCoordinator = true,
    activeCongregationId?: string,
  ): Promise<MissionField> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const field = await this.missionFieldsRepository.findOne({
      where: { id, congregationId },
      relations: withCoordinator ? { coordinatorMember: true } : undefined,
    });
    if (!field) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_FIELD_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_FIELD_NOT_FOUND],
      });
    }
    return field;
  }

  private async assertNameAvailable(
    congregationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.missionFieldsRepository.findOne({
      where: { congregationId, name },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MISSIONS_FIELD_NAME_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_FIELD_NAME_IN_USE],
        details: [
          {
            field: 'name',
            code: ApiErrorCode.MISSIONS_FIELD_NAME_IN_USE,
            message: ApiErrorMessage[ApiErrorCode.MISSIONS_FIELD_NAME_IN_USE],
          },
        ],
      });
    }
  }

  private async assertCoordinatorEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_COORDINATOR_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_COORDINATOR_NOT_FOUND],
        details: [
          {
            field: 'coordinatorMemberId',
            code: ApiErrorCode.MISSIONS_COORDINATOR_NOT_FOUND,
            message:
              ApiErrorMessage[ApiErrorCode.MISSIONS_COORDINATOR_NOT_FOUND],
          },
        ],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION],
        details: [
          {
            field: 'coordinatorMemberId',
            code: ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION],
          },
        ],
      });
    }
    return member;
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
