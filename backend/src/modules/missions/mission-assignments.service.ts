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
import { CreateMissionAssignmentDto } from './dto/create-mission-assignment.dto';
import {
  MissionAssignmentResponseDto,
  PaginatedMissionAssignmentsResponseDto,
} from './dto/mission-assignment-response.dto';
import { QueryMissionAssignmentsDto } from './dto/query-mission-assignments.dto';
import { UpdateMissionAssignmentDto } from './dto/update-mission-assignment.dto';
import { MissionAssignment } from './entities/mission-assignment.entity';
import { MissionAssignmentStatus } from './enums/mission-assignment-status.enum';
import { MissionFieldsService } from './mission-fields.service';

@Injectable()
export class MissionAssignmentsService {
  private readonly logger = new Logger(MissionAssignmentsService.name);

  constructor(
    @InjectRepository(MissionAssignment)
    private readonly assignmentsRepository: Repository<MissionAssignment>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    private readonly missionFieldsService: MissionFieldsService,
  ) {}

  async create(
    dto: CreateMissionAssignmentDto,
    activeCongregationId?: string,
  ): Promise<MissionAssignmentResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const member = await this.assertMemberEligible(
      dto.memberId,
      congregationId,
    );
    await this.missionFieldsService.getFieldOrFailInternal(
      dto.missionFieldId,
      congregationId,
    );

    this.assertDatesValid(
      dto.startDate,
      dto.expectedEndDate,
      undefined,
      dto.status ?? MissionAssignmentStatus.ACTIVE,
    );

    const assignment = this.assignmentsRepository.create({
      congregationId,
      memberId: member.id,
      missionFieldId: dto.missionFieldId,
      role: dto.role,
      status: dto.status ?? MissionAssignmentStatus.ACTIVE,
      startDate: dto.startDate,
      expectedEndDate: dto.expectedEndDate ?? null,
      actualEndDate: null,
      notes: this.nullableText(dto.notes),
    });
    const saved = await this.assignmentsRepository.save(assignment);

    this.logger.log(`Envio missionário criado: ${saved.id}`);
    return MissionAssignmentResponseDto.fromEntity(
      await this.getAssignmentOrFail(saved.id, activeCongregationId),
    );
  }

  async findAll(
    query: QueryMissionAssignmentsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedMissionAssignmentsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status, role, missionFieldId, memberId } = query;

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.member', 'member')
      .leftJoinAndSelect('assignment.missionField', 'missionField')
      .where('assignment.congregationId = :congregationId', { congregationId })
      .orderBy('assignment.startDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('assignment.status = :status', { status });
    }
    if (role) {
      qb.andWhere('assignment.role = :role', { role });
    }
    if (missionFieldId) {
      qb.andWhere('assignment.missionFieldId = :missionFieldId', {
        missionFieldId,
      });
    }
    if (memberId) {
      qb.andWhere('assignment.memberId = :memberId', { memberId });
    }
    if (q) {
      qb.andWhere('(member.fullName LIKE :q OR missionField.name LIKE :q)', {
        q: `%${q}%`,
      });
    }

    const [assignments, total] = await qb.getManyAndCount();
    return {
      data: assignments.map((assignment) =>
        MissionAssignmentResponseDto.fromEntity(assignment),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<MissionAssignmentResponseDto> {
    const assignment = await this.getAssignmentOrFail(id, activeCongregationId);
    return MissionAssignmentResponseDto.fromEntity(assignment);
  }

  async update(
    id: string,
    dto: UpdateMissionAssignmentDto,
    activeCongregationId?: string,
  ): Promise<MissionAssignmentResponseDto> {
    const assignment = await this.getAssignmentOrFail(id, activeCongregationId);
    const congregationId = assignment.congregationId;

    if (dto.memberId !== undefined) {
      await this.assertMemberEligible(dto.memberId, congregationId);
      assignment.memberId = dto.memberId;
    }
    if (dto.missionFieldId !== undefined) {
      await this.missionFieldsService.getFieldOrFailInternal(
        dto.missionFieldId,
        congregationId,
      );
      assignment.missionFieldId = dto.missionFieldId;
    }
    if (dto.role !== undefined) {
      assignment.role = dto.role;
    }
    if (dto.status !== undefined) {
      assignment.status = dto.status;
    }
    if (dto.startDate !== undefined) {
      assignment.startDate = dto.startDate;
    }
    if (dto.expectedEndDate !== undefined) {
      assignment.expectedEndDate = dto.expectedEndDate;
    }
    if (dto.actualEndDate !== undefined) {
      assignment.actualEndDate = dto.actualEndDate;
    }
    if (dto.notes !== undefined) {
      assignment.notes = this.nullableText(dto.notes);
    }

    const finalStatus = dto.status ?? assignment.status;
    this.assertDatesValid(
      assignment.startDate,
      assignment.expectedEndDate ?? undefined,
      assignment.actualEndDate ?? undefined,
      finalStatus,
    );

    if (
      finalStatus === MissionAssignmentStatus.COMPLETED ||
      finalStatus === MissionAssignmentStatus.CANCELLED
    ) {
      if (!assignment.actualEndDate) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.MISSIONS_INVALID_DATES,
          message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
          details: [
            {
              field: 'actualEndDate',
              code: ApiErrorCode.MISSIONS_INVALID_DATES,
              message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
            },
          ],
        });
      }
    }

    const saved = await this.assignmentsRepository.save(assignment);
    this.logger.log(`Envio missionário atualizado: ${saved.id}`);
    return MissionAssignmentResponseDto.fromEntity(
      await this.getAssignmentOrFail(saved.id, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const assignment = await this.getAssignmentOrFail(id, activeCongregationId);
    await this.assignmentsRepository.softRemove(assignment);
    this.logger.log(`Envio missionário removido (soft delete): ${id}`);
  }

  async getAssignmentOrFailInternal(
    id: string,
    congregationId: string,
  ): Promise<MissionAssignment> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id, congregationId },
      relations: { member: true, missionField: true },
    });
    if (!assignment) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_ASSIGNMENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_ASSIGNMENT_NOT_FOUND],
      });
    }
    return assignment;
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getAssignmentOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<MissionAssignment> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const assignment = await this.assignmentsRepository.findOne({
      where: { id, congregationId },
      relations: { member: true, missionField: true },
    });
    if (!assignment) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_ASSIGNMENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_ASSIGNMENT_NOT_FOUND],
      });
    }
    return assignment;
  }

  private async assertMemberEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_WRONG_CONGREGATION],
          },
        ],
      });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_NOT_FOUND],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.MISSIONS_MEMBER_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.MISSIONS_MEMBER_NOT_FOUND],
          },
        ],
      });
    }
    return member;
  }

  private assertDatesValid(
    startDate: string,
    expectedEndDate?: string,
    actualEndDate?: string,
    status?: MissionAssignmentStatus,
  ): void {
    if (expectedEndDate && expectedEndDate < startDate) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_INVALID_DATES,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
        details: [
          {
            field: 'expectedEndDate',
            code: ApiErrorCode.MISSIONS_INVALID_DATES,
            message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
          },
        ],
      });
    }
    if (actualEndDate && actualEndDate < startDate) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_INVALID_DATES,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
        details: [
          {
            field: 'actualEndDate',
            code: ApiErrorCode.MISSIONS_INVALID_DATES,
            message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
          },
        ],
      });
    }
    if (
      status &&
      (status === MissionAssignmentStatus.COMPLETED ||
        status === MissionAssignmentStatus.CANCELLED) &&
      !actualEndDate
    ) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_INVALID_DATES,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
        details: [
          {
            field: 'actualEndDate',
            code: ApiErrorCode.MISSIONS_INVALID_DATES,
            message: ApiErrorMessage[ApiErrorCode.MISSIONS_INVALID_DATES],
          },
        ],
      });
    }
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
