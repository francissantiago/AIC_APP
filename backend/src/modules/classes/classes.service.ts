import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { AddClassEnrollmentDto } from './dto/add-class-enrollment.dto';
import {
  ClassAttendanceEntryDto,
  ClassSessionAttendanceDto,
} from './dto/class-attendance-response.dto';
import {
  ClassEnrollmentOptionDto,
  ClassEnrollmentResponseDto,
  MemberClassSummaryDto,
  PaginatedClassEnrollmentsResponseDto,
} from './dto/class-enrollment-response.dto';
import {
  ClassFrequencyMemberDto,
  ClassFrequencyReportDto,
} from './dto/class-frequency-response.dto';
import {
  ClassResponseDto,
  ClassTeacherOptionDto,
  PaginatedClassesResponseDto,
} from './dto/class-response.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassEnrollmentsDto } from './dto/query-class-enrollments.dto';
import { QueryClassFrequencyDto } from './dto/query-class-frequency.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { QueryEnrollmentOptionsDto } from './dto/query-enrollment-options.dto';
import { QuerySessionAttendanceDto } from './dto/query-session-attendance.dto';
import { QueryTeacherOptionsDto } from './dto/query-teacher-options.dto';
import { UpdateClassEnrollmentDto } from './dto/update-class-enrollment.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import {
  UpsertClassAttendanceDto,
  UpsertClassAttendanceEntryDto,
} from './dto/upsert-class-attendance.dto';
import { ClassAttendance } from './entities/class-attendance.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { EbdClass } from './entities/class.entity';
import { ClassAgeGroup } from './enums/class-age-group.enum';
import { ClassEnrollmentStatus } from './enums/class-enrollment-status.enum';
import { ClassStatus } from './enums/class-status.enum';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    @InjectRepository(EbdClass)
    private readonly classesRepository: Repository<EbdClass>,
    @InjectRepository(ClassEnrollment)
    private readonly enrollmentsRepository: Repository<ClassEnrollment>,
    @InjectRepository(ClassAttendance)
    private readonly attendanceRepository: Repository<ClassAttendance>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(
    dto: CreateClassDto,
    activeCongregationId?: string,
  ): Promise<ClassResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
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
    return this.toResponse(
      await this.getClassOrFail(saved.id, activeCongregationId),
      0,
    );
  }

  async findAll(
    query: QueryClassesDto,
    activeCongregationId?: string,
  ): Promise<PaginatedClassesResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status, ageGroup, dayOfWeek, teacherMemberId } =
      query;

    const qb = this.classesRepository
      .createQueryBuilder('ebdClass')
      .leftJoinAndSelect('ebdClass.teacherMember', 'teacherMember')
      .loadRelationCountAndMap(
        'ebdClass.enrollmentsCount',
        'ebdClass.enrollments',
        'enrollment',
        (subQb) =>
          subQb.andWhere('enrollment.status = :activeStatus', {
            activeStatus: ClassEnrollmentStatus.ACTIVE,
          }),
      )
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
      data: items.map((item) =>
        ClassResponseDto.fromEntity(item, {
          enrollmentsCount: (item as EbdClass & { enrollmentsCount?: number })
            .enrollmentsCount,
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
  ): Promise<ClassResponseDto> {
    const ebdClass = await this.getClassOrFail(id, activeCongregationId);
    const enrollmentsCount = await this.enrollmentsRepository.count({
      where: { classId: id, status: ClassEnrollmentStatus.ACTIVE },
    });
    return this.toResponse(ebdClass, enrollmentsCount);
  }

  async update(
    id: string,
    dto: UpdateClassDto,
    activeCongregationId?: string,
  ): Promise<ClassResponseDto> {
    const ebdClass = await this.getClassOrFail(id, activeCongregationId);

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
    return this.findOne(saved.id);
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const ebdClass = await this.getClassOrFail(id, activeCongregationId);
    await this.classesRepository.softRemove(ebdClass);
    this.logger.log(`Turma EBD removida (soft delete): ${id}`);
  }

  async listTeacherOptions(
    query: QueryTeacherOptionsDto,
    activeCongregationId?: string,
  ): Promise<ClassTeacherOptionDto[]> {
    const congregationId = await this.getCongregationId(activeCongregationId);
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

  async findEnrollments(
    classId: string,
    query: QueryClassEnrollmentsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedClassEnrollmentsResponseDto> {
    await this.getClassOrFail(classId, activeCongregationId);
    const { page, limit, status, q } = query;

    const qb = this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.member', 'member')
      .where('enrollment.classId = :classId', { classId })
      .orderBy('enrollment.enrolledAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('enrollment.status = :status', { status });
    }
    if (q) {
      qb.andWhere('member.fullName LIKE :q', { q: `%${q}%` });
    }

    const [links, total] = await qb.getManyAndCount();
    return {
      data: links.map((link) => ClassEnrollmentResponseDto.fromEntity(link)),
      total,
      page,
      limit,
    };
  }

  async addEnrollment(
    classId: string,
    dto: AddClassEnrollmentDto,
    activeCongregationId?: string,
  ): Promise<ClassEnrollmentResponseDto> {
    const ebdClass = await this.getClassOrFail(classId, activeCongregationId);
    const member = await this.assertEnrollmentMemberEligible(
      dto.memberId,
      ebdClass.congregationId,
    );

    const existing = await this.enrollmentsRepository.findOne({
      where: { classId, memberId: dto.memberId },
    });
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.CLASSES_ENROLLMENT_ALREADY_EXISTS,
        message:
          ApiErrorMessage[ApiErrorCode.CLASSES_ENROLLMENT_ALREADY_EXISTS],
      });
    }

    const link = this.enrollmentsRepository.create({
      classId,
      memberId: dto.memberId,
      status: dto.status ?? ClassEnrollmentStatus.ACTIVE,
      enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
    });
    const saved = await this.enrollmentsRepository.save(link);
    saved.member = member;

    this.logger.log(
      `Membro ${dto.memberId} matriculado na turma EBD ${classId}`,
    );
    return ClassEnrollmentResponseDto.fromEntity(saved);
  }

  async updateEnrollmentStatus(
    classId: string,
    memberId: string,
    dto: UpdateClassEnrollmentDto,
    activeCongregationId?: string,
  ): Promise<ClassEnrollmentResponseDto> {
    await this.getClassOrFail(classId, activeCongregationId);
    const link = await this.getEnrollmentOrFail(classId, memberId);

    link.status = dto.status;
    const saved = await this.enrollmentsRepository.save(link);

    if (!saved.member) {
      saved.member = await this.membersRepository.findOneOrFail({
        where: { id: memberId },
      });
    }

    return ClassEnrollmentResponseDto.fromEntity(saved);
  }

  async removeEnrollment(
    classId: string,
    memberId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    await this.getClassOrFail(classId, activeCongregationId);
    const link = await this.getEnrollmentOrFail(classId, memberId);
    await this.enrollmentsRepository.remove(link);
    this.logger.log(
      `Membro ${memberId} desmatriculado da turma EBD ${classId}`,
    );
  }

  async listEnrollmentOptions(
    classId: string,
    query: QueryEnrollmentOptionsDto,
    activeCongregationId?: string,
  ): Promise<ClassEnrollmentOptionDto[]> {
    const ebdClass = await this.getClassOrFail(classId, activeCongregationId);
    const qb = this.membersRepository
      .createQueryBuilder('member')
      .select(['member.id', 'member.fullName'])
      .where('member.congregationId = :congregationId', {
        congregationId: ebdClass.congregationId,
      })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM class_enrollments ce
          WHERE ce.member_id = member.id AND ce.class_id = :classId
        )`,
        { classId },
      )
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

  async findByMemberId(
    memberId: string,
    activeCongregationId?: string,
  ): Promise<MemberClassSummaryDto[]> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const member = await this.membersRepository.findOne({
      where: { id: memberId, congregationId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }

    const enrollments = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.ebdClass', 'ebdClass')
      .where('enrollment.memberId = :memberId', { memberId })
      .andWhere('ebdClass.congregationId = :congregationId', { congregationId })
      .orderBy('ebdClass.name', 'ASC')
      .getMany();

    return enrollments.map((enrollment) => {
      const dto = new MemberClassSummaryDto();
      dto.id = enrollment.ebdClass.id;
      dto.name = enrollment.ebdClass.name;
      dto.ageGroup = enrollment.ebdClass.ageGroup;
      dto.status = enrollment.ebdClass.status;
      dto.enrollmentStatus = enrollment.status;
      dto.enrolledAt = enrollment.enrolledAt;
      return dto;
    });
  }

  async getSessionAttendance(
    classId: string,
    query: QuerySessionAttendanceDto,
    activeCongregationId?: string,
  ): Promise<ClassSessionAttendanceDto> {
    const ebdClass = await this.getClassOrFail(classId, activeCongregationId);
    const sessionDate = query.sessionDate;
    const enrollments = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.member', 'member')
      .where('enrollment.classId = :classId', { classId })
      .andWhere('enrollment.status = :status', {
        status: ClassEnrollmentStatus.ACTIVE,
      })
      .orderBy('member.fullName', 'ASC')
      .getMany();

    const attendanceRows = await this.attendanceRepository.find({
      where: { classId, sessionDate },
    });
    const attendanceByMember = new Map(
      attendanceRows.map((row) => [row.memberId, row]),
    );

    const entries: ClassAttendanceEntryDto[] = enrollments.map((enrollment) => {
      const attendance = attendanceByMember.get(enrollment.memberId);
      return {
        memberId: enrollment.memberId,
        memberFullName: enrollment.member?.fullName ?? '',
        enrollmentStatus: ClassEnrollmentStatus.ACTIVE,
        attendanceId: attendance?.id ?? null,
        present: attendance ? attendance.present : null,
        notes: attendance?.notes ?? null,
      };
    });

    return {
      classId: ebdClass.id,
      className: ebdClass.name,
      sessionDate,
      entries,
    };
  }

  async upsertSessionAttendance(
    classId: string,
    dto: UpsertClassAttendanceDto,
    activeCongregationId?: string,
  ): Promise<ClassSessionAttendanceDto> {
    await this.getClassOrFail(classId, activeCongregationId);

    if (!dto.entries?.length) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CLASSES_ATTENDANCE_EMPTY_ENTRIES,
        message: ApiErrorMessage[ApiErrorCode.CLASSES_ATTENDANCE_EMPTY_ENTRIES],
      });
    }

    const memberIds = [...new Set(dto.entries.map((entry) => entry.memberId))];
    const activeLinks = await this.enrollmentsRepository.find({
      where: {
        classId,
        memberId: In(memberIds),
        status: ClassEnrollmentStatus.ACTIVE,
      },
    });
    const activeMemberIds = new Set(activeLinks.map((link) => link.memberId));
    const notEnrolled = memberIds.find((id) => !activeMemberIds.has(id));
    if (notEnrolled) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED,
        message:
          ApiErrorMessage[ApiErrorCode.CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED],
        details: [
          {
            field: 'entries',
            code: ApiErrorCode.CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED,
            message:
              ApiErrorMessage[
                ApiErrorCode.CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED
              ],
          },
        ],
      });
    }

    for (const entry of dto.entries) {
      await this.upsertAttendanceEntry(classId, dto.sessionDate, entry);
    }

    this.logger.log(
      `Chamada EBD salva: turma ${classId}, sessão ${dto.sessionDate}, ${dto.entries.length} entradas`,
    );

    return this.getSessionAttendance(classId, {
      sessionDate: dto.sessionDate,
    });
  }

  async getFrequencyReport(
    classId: string,
    query: QueryClassFrequencyDto,
    activeCongregationId?: string,
  ): Promise<ClassFrequencyReportDto> {
    this.validateAttendancePeriod(query.from, query.to);
    const ebdClass = await this.getClassOrFail(classId, activeCongregationId);

    const attendanceRows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.classId = :classId', { classId })
      .andWhere('attendance.sessionDate >= :from', { from: query.from })
      .andWhere('attendance.sessionDate <= :to', { to: query.to })
      .getMany();

    const sessionDates = new Set(
      attendanceRows.map((row) => this.toDateString(row.sessionDate)),
    );
    const sessionsCount = sessionDates.size;

    const enrollments = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.member', 'member')
      .where('enrollment.classId = :classId', { classId })
      .andWhere('enrollment.status = :status', {
        status: ClassEnrollmentStatus.ACTIVE,
      })
      .orderBy('member.fullName', 'ASC')
      .getMany();

    const presentByMember = new Map<string, number>();
    for (const row of attendanceRows) {
      if (!row.present) {
        continue;
      }
      presentByMember.set(
        row.memberId,
        (presentByMember.get(row.memberId) ?? 0) + 1,
      );
    }

    const members: ClassFrequencyMemberDto[] = enrollments.map((enrollment) => {
      const presentCount = presentByMember.get(enrollment.memberId) ?? 0;
      const absentCount = sessionsCount - presentCount;
      return {
        memberId: enrollment.memberId,
        memberFullName: enrollment.member?.fullName ?? '',
        presentCount,
        absentCount,
        frequencyPct: this.frequencyPct(presentCount, sessionsCount),
      };
    });

    const classAveragePct =
      members.length === 0
        ? 0
        : this.roundOneDecimal(
            members.reduce((sum, member) => sum + member.frequencyPct, 0) /
              members.length,
          );

    return {
      classId: ebdClass.id,
      className: ebdClass.name,
      from: query.from,
      to: query.to,
      sessionsCount,
      members,
      classAveragePct,
    };
  }

  async exportFrequencyCsv(
    classId: string,
    query: QueryClassFrequencyDto,
    activeCongregationId?: string,
  ): Promise<string> {
    const report = await this.getFrequencyReport(
      classId,
      query,
      activeCongregationId,
    );
    const rows = [
      [
        'Membro',
        'Presenças',
        'Faltas',
        'Frequência %',
        'Sessões',
        'Turma',
        'De',
        'Até',
        'Média da turma %',
      ],
      ...report.members.map((member) => [
        member.memberFullName,
        String(member.presentCount),
        String(member.absentCount),
        String(member.frequencyPct),
        String(report.sessionsCount),
        report.className,
        report.from,
        report.to,
        String(report.classAveragePct),
      ]),
    ];
    return `\uFEFF${rows.map((row) => row.map(this.csvCell).join(';')).join('\r\n')}`;
  }

  private async upsertAttendanceEntry(
    classId: string,
    sessionDate: string,
    entry: UpsertClassAttendanceEntryDto,
  ): Promise<void> {
    const existing = await this.attendanceRepository.findOne({
      where: { classId, memberId: entry.memberId, sessionDate },
    });
    if (existing) {
      existing.present = entry.present;
      if (entry.notes !== undefined) {
        existing.notes = this.nullableText(entry.notes);
      }
      await this.attendanceRepository.save(existing);
      return;
    }
    const row = this.attendanceRepository.create({
      classId,
      memberId: entry.memberId,
      sessionDate,
      present: entry.present,
      notes: this.nullableText(entry.notes),
    });
    await this.attendanceRepository.save(row);
  }

  private validateAttendancePeriod(from: string, to: string): void {
    if (from > to) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CLASSES_ATTENDANCE_PERIOD_INVALID,
        message:
          ApiErrorMessage[ApiErrorCode.CLASSES_ATTENDANCE_PERIOD_INVALID],
      });
    }
    const max = new Date(`${from}T00:00:00.000Z`);
    max.setUTCMonth(max.getUTCMonth() + 24);
    if (new Date(`${to}T00:00:00.000Z`) > max) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CLASSES_ATTENDANCE_PERIOD_INVALID,
        message:
          ApiErrorMessage[ApiErrorCode.CLASSES_ATTENDANCE_PERIOD_INVALID],
      });
    }
  }

  private frequencyPct(presentCount: number, sessionsCount: number): number {
    if (sessionsCount === 0) {
      return 0;
    }
    return this.roundOneDecimal((presentCount / sessionsCount) * 100);
  }

  private roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private toDateString(value: string | Date): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }
    return value.toISOString().slice(0, 10);
  }

  private readonly csvCell = (value: string): string =>
    `"${value.replaceAll('"', '""')}"`;

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getClassOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<EbdClass> {
    const congregationId = await this.getCongregationId(activeCongregationId);
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

  private async getEnrollmentOrFail(
    classId: string,
    memberId: string,
  ): Promise<ClassEnrollment> {
    const link = await this.enrollmentsRepository.findOne({
      where: { classId, memberId },
      relations: { member: true },
    });
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CLASSES_ENROLLMENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.CLASSES_ENROLLMENT_NOT_FOUND],
      });
    }
    return link;
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

  private async assertEnrollmentMemberEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[
            ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION
          ],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[
                ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION
              ],
          },
        ],
      });
    }
    return member;
  }

  private toResponse(
    ebdClass: EbdClass,
    enrollmentsCount?: number,
  ): ClassResponseDto {
    return ClassResponseDto.fromEntity(ebdClass, { enrollmentsCount });
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
