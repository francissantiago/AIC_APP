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
import {
  ClassResponseDto,
  ClassTeacherOptionDto,
  PaginatedClassesResponseDto,
} from './dto/class-response.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { QueryTeacherOptionsDto } from './dto/query-teacher-options.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { EbdClass } from './entities/class.entity';
import { ClassAgeGroup } from './enums/class-age-group.enum';
import { ClassStatus } from './enums/class-status.enum';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    @InjectRepository(EbdClass)
    private readonly classesRepository: Repository<EbdClass>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(dto: CreateClassDto): Promise<ClassResponseDto> {
    const congregationId = await this.getCongregationId();
    const name = dto.name.trim();
    await this.assertNameAvailable(congregationId, name);

    let teacherMemberId: string | null = null;
    if (dto.teacherMemberId) {
      await this.assertTeacherEligible(dto.teacherMemberId, congregationId);
      teacherMemberId = dto.teacherMemberId;
    }

    const ebdClass = this.classesRepository.create({
      congregationId,
      name,
      description: this.nullableText(dto.description),
      ageGroup: dto.ageGroup ?? ClassAgeGroup.MIXED,
      teacherMemberId,
      dayOfWeek: dto.dayOfWeek ?? 0,
      startTime: this.normalizeStartTime(dto.startTime),
      room: this.nullableText(dto.room),
      status: dto.status ?? ClassStatus.ACTIVE,
    });
    const saved = await this.classesRepository.save(ebdClass);

    this.logger.log(`Turma EBD criada: ${saved.id} (${saved.name})`);
    return this.toResponse(await this.getClassOrFail(saved.id));
  }

  async findAll(query: QueryClassesDto): Promise<PaginatedClassesResponseDto> {
    const congregationId = await this.getCongregationId();
    const { page, limit, q, status, ageGroup, dayOfWeek, teacherMemberId } =
      query;

    const qb = this.classesRepository
      .createQueryBuilder('ebdClass')
      .leftJoinAndSelect('ebdClass.teacherMember', 'teacherMember')
      .where('ebdClass.congregationId = :congregationId', { congregationId })
      .orderBy('ebdClass.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('ebdClass.status = :status', { status });
    }
    if (ageGroup) {
      qb.andWhere('ebdClass.ageGroup = :ageGroup', { ageGroup });
    }
    if (dayOfWeek !== undefined) {
      qb.andWhere('ebdClass.dayOfWeek = :dayOfWeek', { dayOfWeek });
    }
    if (teacherMemberId) {
      qb.andWhere('ebdClass.teacherMemberId = :teacherMemberId', {
        teacherMemberId,
      });
    }
    if (q) {
      qb.andWhere('ebdClass.name LIKE :q', { q: `%${q}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items.map((item) => ClassResponseDto.fromEntity(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ClassResponseDto> {
    return this.toResponse(await this.getClassOrFail(id));
  }

  async update(id: string, dto: UpdateClassDto): Promise<ClassResponseDto> {
    const ebdClass = await this.getClassOrFail(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== ebdClass.name) {
        await this.assertNameAvailable(ebdClass.congregationId, name, id);
      }
      ebdClass.name = name;
    }
    if (dto.description !== undefined) {
      ebdClass.description = this.nullableText(dto.description);
    }
    if (dto.ageGroup !== undefined) {
      ebdClass.ageGroup = dto.ageGroup;
    }
    if (dto.dayOfWeek !== undefined) {
      ebdClass.dayOfWeek = dto.dayOfWeek;
    }
    if (dto.startTime !== undefined) {
      ebdClass.startTime = this.normalizeStartTime(dto.startTime);
    }
    if (dto.room !== undefined) {
      ebdClass.room = this.nullableText(dto.room);
    }
    if (dto.status !== undefined) {
      ebdClass.status = dto.status;
    }

    if (dto.teacherMemberId !== undefined) {
      if (dto.teacherMemberId === null || dto.teacherMemberId === '') {
        ebdClass.teacherMemberId = null;
      } else {
        await this.assertTeacherEligible(
          dto.teacherMemberId,
          ebdClass.congregationId,
        );
        ebdClass.teacherMemberId = dto.teacherMemberId;
      }
    }

    const saved = await this.classesRepository.save(ebdClass);
    this.logger.log(`Turma EBD atualizada: ${saved.id}`);
    return this.toResponse(await this.getClassOrFail(saved.id));
  }

  async remove(id: string): Promise<void> {
    const ebdClass = await this.getClassOrFail(id);
    await this.classesRepository.softRemove(ebdClass);
    this.logger.log(`Turma EBD removida (soft delete): ${id}`);
  }

  async listTeacherOptions(
    query: QueryTeacherOptionsDto,
  ): Promise<ClassTeacherOptionDto[]> {
    const congregationId = await this.getCongregationId();
    const qb = this.membersRepository
      .createQueryBuilder('member')
      .select(['member.id', 'member.fullName'])
      .where('member.congregationId = :congregationId', { congregationId })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .orderBy('member.fullName', 'ASC')
      .take(query.limit);
    if (query.q) {
      qb.andWhere('member.fullName LIKE :q', { q: `%${query.q}%` });
    }
    return (await qb.getMany()).map((member) => ({
      id: member.id,
      fullName: member.fullName,
    }));
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getClassOrFail(id: string): Promise<EbdClass> {
    const congregationId = await this.getCongregationId();
    const ebdClass = await this.classesRepository.findOne({
      where: { id, congregationId },
      relations: { teacherMember: true },
    });
    if (!ebdClass) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CLASSES_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CLASSES_NOT_FOUND],
      });
    }
    return ebdClass;
  }

  private async assertNameAvailable(
    congregationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.classesRepository.findOne({
      where: { congregationId, name },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.CLASSES_NAME_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.CLASSES_NAME_IN_USE],
        details: [
          {
            field: 'name',
            code: ApiErrorCode.CLASSES_NAME_IN_USE,
            message: ApiErrorMessage[ApiErrorCode.CLASSES_NAME_IN_USE],
          },
        ],
      });
    }
  }

  private async assertTeacherEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CLASSES_TEACHER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CLASSES_TEACHER_NOT_FOUND],
        details: [
          {
            field: 'teacherMemberId',
            code: ApiErrorCode.CLASSES_TEACHER_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.CLASSES_TEACHER_NOT_FOUND],
          },
        ],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CLASSES_TEACHER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.CLASSES_TEACHER_WRONG_CONGREGATION],
        details: [
          {
            field: 'teacherMemberId',
            code: ApiErrorCode.CLASSES_TEACHER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[ApiErrorCode.CLASSES_TEACHER_WRONG_CONGREGATION],
          },
        ],
      });
    }
    return member;
  }

  private toResponse(ebdClass: EbdClass): ClassResponseDto {
    return ClassResponseDto.fromEntity(ebdClass);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeStartTime(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }
    return trimmed;
  }
}
