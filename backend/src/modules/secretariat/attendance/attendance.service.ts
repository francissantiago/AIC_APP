import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  AttendanceRecordResponseDto,
  CreateAttendanceRecordDto,
  PaginatedAttendanceResponseDto,
  QueryAttendanceDto,
  UpdateAttendanceRecordDto,
} from '../dto/secretariat.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async createRecord(
    dto: CreateAttendanceRecordDto,
    user: UserResponseDto,
  ): Promise<AttendanceRecordResponseDto> {
    const congregationId = await this.getCongregationId();
    this.validateComposition(dto.totalPresent, dto.adults, dto.children);
    const record = this.attendanceRepository.create({
      congregationId,
      createdByUserId: user.id,
      eventDate: dto.eventDate,
      eventType: dto.eventType,
      calendarEventId: dto.calendarEventId ?? null,
      totalPresent: dto.totalPresent,
      adults: dto.adults ?? null,
      children: dto.children ?? null,
      notes: this.nullableText(dto.notes),
    });
    const saved = await this.attendanceRepository.save(record);
    this.logger.log(`Registro de presença criado: ${saved.id}`);
    return this.toDto(saved);
  }

  async findRecords(
    query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const congregationId = await this.getCongregationId();
    const qb = this.attendanceRepository
      .createQueryBuilder('record')
      .where('record.congregationId = :congregationId', { congregationId });
    this.applyFilters(qb, query);
    qb.orderBy('record.eventDate', 'DESC')
      .addOrderBy('record.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [records, total] = await qb.getManyAndCount();
    return {
      data: records.map(this.toDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findRecord(id: string): Promise<AttendanceRecordResponseDto> {
    const congregationId = await this.getCongregationId();
    return this.toDto(await this.getRecordOrFail(id, congregationId));
  }

  async updateRecord(
    id: string,
    dto: UpdateAttendanceRecordDto,
  ): Promise<AttendanceRecordResponseDto> {
    const congregationId = await this.getCongregationId();
    const record = await this.getRecordOrFail(id, congregationId);
    const nextTotalPresent = dto.totalPresent ?? record.totalPresent;
    const nextAdults = dto.adults !== undefined ? dto.adults : record.adults;
    const nextChildren =
      dto.children !== undefined ? dto.children : record.children;
    this.validateComposition(nextTotalPresent, nextAdults, nextChildren);
    if (dto.eventDate !== undefined) record.eventDate = dto.eventDate;
    if (dto.eventType !== undefined) record.eventType = dto.eventType;
    if (dto.calendarEventId !== undefined) {
      record.calendarEventId = dto.calendarEventId ?? null;
    }
    if (dto.totalPresent !== undefined) record.totalPresent = dto.totalPresent;
    if (dto.adults !== undefined) record.adults = dto.adults ?? null;
    if (dto.children !== undefined) record.children = dto.children ?? null;
    if (dto.notes !== undefined) record.notes = this.nullableText(dto.notes);
    const saved = await this.attendanceRepository.save(record);
    this.logger.log(`Registro de presença atualizado: ${saved.id}`);
    return this.toDto(saved);
  }

  async removeRecord(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.attendanceRepository.softRemove(
      await this.getRecordOrFail(id, congregationId),
    );
    this.logger.log(`Registro de presença removido (soft delete): ${id}`);
  }

  async getLastRecord(
    congregationId: string,
  ): Promise<AttendanceRecord | null> {
    return this.attendanceRepository.findOne({
      where: { congregationId },
      order: { eventDate: 'DESC', createdAt: 'DESC' },
    });
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getRecordOrFail(
    id: string,
    congregationId: string,
  ): Promise<AttendanceRecord> {
    const record = await this.attendanceRepository.findOne({
      where: { id, congregationId },
    });
    if (!record) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_ATTENDANCE_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_ATTENDANCE_NOT_FOUND],
      });
    }
    return record;
  }

  private applyFilters(
    qb: SelectQueryBuilder<AttendanceRecord>,
    query: QueryAttendanceDto,
  ): void {
    if (query.from) {
      qb.andWhere('record.eventDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('record.eventDate <= :to', { to: query.to });
    }
    if (query.eventType) {
      qb.andWhere('record.eventType = :eventType', {
        eventType: query.eventType,
      });
    }
  }

  private validateComposition(
    totalPresent: number,
    adults: number | null | undefined,
    children: number | null | undefined,
  ): void {
    if (
      adults != null &&
      children != null &&
      adults + children !== totalPresent
    ) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_ATTENDANCE_TOTAL_MISMATCH,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_ATTENDANCE_TOTAL_MISMATCH],
      });
    }
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readonly toDto = (
    record: AttendanceRecord,
  ): AttendanceRecordResponseDto => ({
    id: record.id,
    congregationId: record.congregationId,
    createdByUserId: record.createdByUserId,
    eventDate: record.eventDate,
    eventType: record.eventType,
    calendarEventId: record.calendarEventId,
    totalPresent: record.totalPresent,
    adults: record.adults,
    children: record.children,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
