import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinancialType, PaymentMethod } from '../finance/enums/finance.enums';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateMissionBookletDto } from './dto/create-mission-booklet.dto';
import {
  BulkMissionBookletsResponseDto,
  CreateMissionBookletsBulkDto,
} from './dto/create-mission-booklets-bulk.dto';
import { MissionBookletInstallmentResponseDto } from './dto/mission-booklet-installment-response.dto';
import {
  MissionBookletResponseDto,
  PaginatedMissionBookletsResponseDto,
} from './dto/mission-booklet-response.dto';
import { PayMissionBookletInstallmentDto } from './dto/pay-mission-booklet-installment.dto';
import { QueryMissionBookletsDto } from './dto/query-mission-booklets.dto';
import { UpdateMissionBookletDto } from './dto/update-mission-booklet.dto';
import { MissionBookletInstallment } from './entities/mission-booklet-installment.entity';
import { MissionBooklet } from './entities/mission-booklet.entity';
import { MissionBookletDestinationType } from './enums/mission-booklet-destination-type.enum';
import { MissionBookletInstallmentStatus } from './enums/mission-booklet-installment-status.enum';
import { MissionBookletStatus } from './enums/mission-booklet-status.enum';
import { MissionAssignmentsService } from './mission-assignments.service';
import { MissionFieldsService } from './mission-fields.service';
import { addMonthsToIsoDate } from './utils/mission-booklet-dates.util';

const DEFAULT_MISSIONS_CATEGORY_NAME = 'Missões';

@Injectable()
export class MissionBookletsService {
  private readonly logger = new Logger(MissionBookletsService.name);

  constructor(
    @InjectRepository(MissionBooklet)
    private readonly bookletsRepository: Repository<MissionBooklet>,
    @InjectRepository(MissionBookletInstallment)
    private readonly installmentsRepository: Repository<MissionBookletInstallment>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(FinancialEntry)
    private readonly entriesRepository: Repository<FinancialEntry>,
    @InjectRepository(FinancialCategory)
    private readonly categoriesRepository: Repository<FinancialCategory>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly congregationsService: CongregationsService,
    private readonly missionFieldsService: MissionFieldsService,
    private readonly missionAssignmentsService: MissionAssignmentsService,
  ) {}

  async create(
    dto: CreateMissionBookletDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<MissionBookletResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const member = await this.assertMemberEligible(
      dto.memberId,
      congregationId,
    );
    const destination = await this.resolveDestination(dto, congregationId);
    const installmentAmount = this.money(dto.installmentAmount);
    const totalAmount = this.money(
      dto.installmentAmount * dto.installmentCount,
    );

    const saved = await this.dataSource.transaction(async (manager) => {
      const bookletsRepo = manager.getRepository(MissionBooklet);
      const installmentsRepo = manager.getRepository(MissionBookletInstallment);

      const booklet = bookletsRepo.create({
        congregationId,
        memberId: member.id,
        destinationType: dto.destinationType,
        missionFieldId: destination.missionFieldId,
        missionAssignmentId: destination.missionAssignmentId,
        title: this.nullableText(dto.title),
        installmentCount: dto.installmentCount,
        installmentAmount,
        totalAmount,
        firstDueDate: dto.firstDueDate,
        status: MissionBookletStatus.ACTIVE,
        notes: this.nullableText(dto.notes),
        createdByUserId: user.id,
      });
      const savedBooklet = await bookletsRepo.save(booklet);

      const installments = Array.from(
        { length: dto.installmentCount },
        (_, index) =>
          installmentsRepo.create({
            bookletId: savedBooklet.id,
            installmentNumber: index + 1,
            dueDate: addMonthsToIsoDate(dto.firstDueDate, index),
            amount: installmentAmount,
            status: MissionBookletInstallmentStatus.PENDING,
          }),
      );
      await installmentsRepo.save(installments);

      return savedBooklet;
    });

    this.logger.log(`Carnê missionário criado: ${saved.id}`);
    return this.findOne(saved.id, activeCongregationId);
  }

  async createBulk(
    dto: CreateMissionBookletsBulkDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<BulkMissionBookletsResponseDto> {
    const results: MissionBookletResponseDto[] = [];

    await this.dataSource.transaction(async () => {
      for (const memberId of dto.memberIds) {
        const singleDto: CreateMissionBookletDto = {
          memberId,
          destinationType: dto.destinationType,
          missionFieldId: dto.missionFieldId,
          missionAssignmentId: dto.missionAssignmentId,
          title: dto.title,
          installmentCount: dto.installmentCount,
          installmentAmount: dto.installmentAmount,
          firstDueDate: dto.firstDueDate,
          notes: dto.notes,
        };
        const created = await this.create(
          singleDto,
          user,
          activeCongregationId,
        );
        results.push(created);
      }
    });

    this.logger.log(`${results.length} carnês missionários emitidos em lote`);
    return { data: results, total: results.length };
  }

  async findAll(
    query: QueryMissionBookletsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedMissionBookletsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const {
      page,
      limit,
      q,
      status,
      destinationType,
      memberId,
      missionFieldId,
    } = query;

    const qb = this.bookletsRepository
      .createQueryBuilder('booklet')
      .leftJoinAndSelect('booklet.member', 'member')
      .leftJoinAndSelect('booklet.missionField', 'missionField')
      .leftJoinAndSelect('booklet.missionAssignment', 'missionAssignment')
      .leftJoinAndSelect('missionAssignment.member', 'assignmentMember')
      .leftJoinAndSelect('missionAssignment.missionField', 'assignmentField')
      .where('booklet.congregationId = :congregationId', { congregationId })
      .orderBy('booklet.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('booklet.status = :status', { status });
    if (destinationType) {
      qb.andWhere('booklet.destinationType = :destinationType', {
        destinationType,
      });
    }
    if (memberId) qb.andWhere('booklet.memberId = :memberId', { memberId });
    if (missionFieldId) {
      qb.andWhere('booklet.missionFieldId = :missionFieldId', {
        missionFieldId,
      });
    }
    if (q) {
      qb.andWhere('(booklet.title LIKE :q OR member.fullName LIKE :q)', {
        q: `%${q}%`,
      });
    }

    const [booklets, total] = await qb.getManyAndCount();
    const data = await Promise.all(
      booklets.map(async (booklet) => {
        const summary = await this.getInstallmentSummary(booklet.id);
        return MissionBookletResponseDto.fromEntity(booklet, summary);
      }),
    );

    return { data, total, page, limit };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<MissionBookletResponseDto> {
    const booklet = await this.getBookletOrFail(id, true, activeCongregationId);
    const summary = await this.getInstallmentSummary(id);
    return MissionBookletResponseDto.fromEntity(booklet, summary);
  }

  async update(
    id: string,
    dto: UpdateMissionBookletDto,
    activeCongregationId?: string,
  ): Promise<MissionBookletResponseDto> {
    const booklet = await this.getBookletOrFail(
      id,
      false,
      activeCongregationId,
    );

    if (dto.title !== undefined) {
      booklet.title = this.nullableText(dto.title);
    }
    if (dto.notes !== undefined) {
      booklet.notes = this.nullableText(dto.notes);
    }

    await this.bookletsRepository.save(booklet);
    return this.findOne(id, activeCongregationId);
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const booklet = await this.getBookletOrFail(
      id,
      false,
      activeCongregationId,
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(MissionBookletInstallment).update(
        {
          bookletId: booklet.id,
          status: MissionBookletInstallmentStatus.PENDING,
        },
        { status: MissionBookletInstallmentStatus.CANCELLED },
      );
      booklet.status = MissionBookletStatus.CANCELLED;
      await manager.getRepository(MissionBooklet).softRemove(booklet);
    });

    this.logger.log(`Carnê missionário removido (soft delete): ${id}`);
  }

  async findInstallments(
    bookletId: string,
    activeCongregationId?: string,
  ): Promise<MissionBookletInstallmentResponseDto[]> {
    await this.getBookletOrFail(bookletId, false, activeCongregationId);
    const installments = await this.installmentsRepository.find({
      where: { bookletId },
      order: { installmentNumber: 'ASC' },
    });
    return installments.map((item) =>
      MissionBookletInstallmentResponseDto.fromEntity(item),
    );
  }

  async payInstallment(
    bookletId: string,
    installmentId: string,
    dto: PayMissionBookletInstallmentDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<MissionBookletInstallmentResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const booklet = await this.getBookletOrFail(
      bookletId,
      true,
      activeCongregationId,
    );

    if (booklet.status === MissionBookletStatus.CANCELLED) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_BOOKLET_CANCELLED,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_CANCELLED],
      });
    }

    const installment = await this.installmentsRepository.findOne({
      where: { id: installmentId, bookletId },
    });
    if (!installment) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_NOT_FOUND],
      });
    }
    if (installment.status === MissionBookletInstallmentStatus.PAID) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_ALREADY_PAID,
        message:
          ApiErrorMessage[
            ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_ALREADY_PAID
          ],
      });
    }
    if (installment.status === MissionBookletInstallmentStatus.CANCELLED) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_CANCELLED,
        message:
          ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_CANCELLED],
      });
    }

    const category = await this.resolveMissionsCategory(congregationId);
    const missionFieldId = this.resolveFinancialMissionFieldId(booklet);
    const entryDate = dto.paidAt ?? new Date().toISOString().slice(0, 10);
    const paidAt = dto.paidAt
      ? new Date(`${dto.paidAt}T12:00:00.000Z`)
      : new Date();

    const savedInstallment = await this.dataSource.transaction(
      async (manager) => {
        const entriesRepo = manager.getRepository(FinancialEntry);
        const installmentsRepo = manager.getRepository(
          MissionBookletInstallment,
        );
        const bookletsRepo = manager.getRepository(MissionBooklet);

        const entry = entriesRepo.create({
          congregationId,
          categoryId: category.id,
          createdByUserId: user.id,
          memberId: booklet.memberId,
          missionFieldId,
          missionBookletInstallmentId: installment.id,
          type: FinancialType.INCOME,
          amount: installment.amount,
          entryDate,
          description: `Carnê missionário — parcela ${installment.installmentNumber}/${booklet.installmentCount}`,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.OTHER,
          reference: `mission-booklet:${booklet.id}`,
          notes: this.nullableText(dto.notes),
        });
        const savedEntry = await entriesRepo.save(entry);

        installment.status = MissionBookletInstallmentStatus.PAID;
        installment.paidAt = paidAt;
        installment.financialEntryId = savedEntry.id;
        installment.notes = this.nullableText(dto.notes) ?? installment.notes;
        const saved = await installmentsRepo.save(installment);

        const pendingCount = await installmentsRepo.count({
          where: {
            bookletId,
            status: MissionBookletInstallmentStatus.PENDING,
          },
        });
        if (pendingCount === 0) {
          booklet.status = MissionBookletStatus.COMPLETED;
          await bookletsRepo.save(booklet);
        }

        return saved;
      },
    );

    this.logger.log(`Parcela ${installmentId} do carnê ${bookletId} quitada`);
    return MissionBookletInstallmentResponseDto.fromEntity(savedInstallment);
  }

  async cancelInstallment(
    bookletId: string,
    installmentId: string,
    activeCongregationId?: string,
  ): Promise<MissionBookletInstallmentResponseDto> {
    await this.getBookletOrFail(bookletId, false, activeCongregationId);
    const installment = await this.installmentsRepository.findOne({
      where: { id: installmentId, bookletId },
    });
    if (!installment) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_NOT_FOUND],
      });
    }
    if (installment.status !== MissionBookletInstallmentStatus.PENDING) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_NOT_PENDING,
        message:
          ApiErrorMessage[
            ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_NOT_PENDING
          ],
      });
    }

    installment.status = MissionBookletInstallmentStatus.CANCELLED;
    const saved = await this.installmentsRepository.save(installment);
    return MissionBookletInstallmentResponseDto.fromEntity(saved);
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) return activeCongregationId;
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getBookletOrFail(
    id: string,
    withRelations: boolean,
    activeCongregationId?: string,
  ): Promise<MissionBooklet> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const booklet = await this.bookletsRepository.findOne({
      where: { id, congregationId },
      relations: withRelations
        ? {
            member: true,
            missionField: true,
            missionAssignment: {
              member: true,
              missionField: true,
            },
          }
        : undefined,
    });
    if (!booklet) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MISSIONS_BOOKLET_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_NOT_FOUND],
      });
    }
    return booklet;
  }

  private async getInstallmentSummary(bookletId: string): Promise<{
    paidCount: number;
    pendingCount: number;
    totalPaid: string;
  }> {
    const rows = await this.installmentsRepository
      .createQueryBuilder('installment')
      .select('installment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(installment.amount), 0)', 'total')
      .where('installment.bookletId = :bookletId', { bookletId })
      .groupBy('installment.status')
      .getRawMany<{
        status: MissionBookletInstallmentStatus;
        count: string;
        total: string;
      }>();

    let paidCount = 0;
    let pendingCount = 0;
    let totalPaid = 0;

    for (const row of rows) {
      const count = Number(row.count);
      if (row.status === MissionBookletInstallmentStatus.PAID) {
        paidCount = count;
        totalPaid = Number(row.total);
      }
      if (row.status === MissionBookletInstallmentStatus.PENDING) {
        pendingCount = count;
      }
    }

    return {
      paidCount,
      pendingCount,
      totalPaid: totalPaid.toFixed(2),
    };
  }

  private async assertMemberEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member || member.status !== MemberStatus.ACTIVE) {
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
      });
    }
    return member;
  }

  private async resolveDestination(
    dto: CreateMissionBookletDto,
    congregationId: string,
  ): Promise<{
    missionFieldId: string | null;
    missionAssignmentId: string | null;
  }> {
    if (dto.destinationType === MissionBookletDestinationType.GENERAL) {
      if (dto.missionFieldId || dto.missionAssignmentId) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.MISSIONS_BOOKLET_INVALID_DESTINATION,
          message:
            ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_INVALID_DESTINATION],
        });
      }
      return { missionFieldId: null, missionAssignmentId: null };
    }

    if (dto.destinationType === MissionBookletDestinationType.FIELD) {
      if (!dto.missionFieldId || dto.missionAssignmentId) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.MISSIONS_BOOKLET_INVALID_DESTINATION,
          message:
            ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_INVALID_DESTINATION],
        });
      }
      await this.missionFieldsService.getFieldOrFailInternal(
        dto.missionFieldId,
        congregationId,
      );
      return {
        missionFieldId: dto.missionFieldId,
        missionAssignmentId: null,
      };
    }

    if (!dto.missionAssignmentId || dto.missionFieldId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_BOOKLET_INVALID_DESTINATION,
        message:
          ApiErrorMessage[ApiErrorCode.MISSIONS_BOOKLET_INVALID_DESTINATION],
      });
    }
    await this.missionAssignmentsService.getAssignmentOrFailInternal(
      dto.missionAssignmentId,
      congregationId,
    );
    return {
      missionFieldId: null,
      missionAssignmentId: dto.missionAssignmentId,
    };
  }

  private resolveFinancialMissionFieldId(
    booklet: MissionBooklet,
  ): string | null {
    if (booklet.destinationType === MissionBookletDestinationType.GENERAL) {
      return null;
    }
    if (booklet.destinationType === MissionBookletDestinationType.FIELD) {
      return booklet.missionFieldId;
    }
    return booklet.missionAssignment?.missionFieldId ?? null;
  }

  private async resolveMissionsCategory(
    congregationId: string,
  ): Promise<FinancialCategory> {
    const category = await this.categoriesRepository.findOne({
      where: {
        congregationId,
        name: DEFAULT_MISSIONS_CATEGORY_NAME,
        type: FinancialType.INCOME,
      },
    });
    if (!category) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MISSIONS_CATEGORY_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MISSIONS_CATEGORY_NOT_FOUND],
      });
    }
    return category;
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
