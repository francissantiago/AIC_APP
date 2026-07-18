import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { CreateMemberDto } from '../../members/dto/create-member.dto';
import { MemberResponseDto } from '../../members/dto/member-response.dto';
import { MembersService } from '../../members/members.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  ConvertVisitorToMemberDto,
  ConvertVisitorToMemberResponseDto,
  CreateVisitorDto,
  PaginatedVisitorsResponseDto,
  QueryVisitorsDto,
  UpdateVisitorDto,
  VisitorResponseDto,
} from '../dto/secretariat.dto';
import { Visitor } from './entities/visitor.entity';

@Injectable()
export class VisitorsService {
  private readonly logger = new Logger(VisitorsService.name);

  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
    private readonly congregationsService: CongregationsService,
    private readonly membersService: MembersService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async createVisitor(
    dto: CreateVisitorDto,
    user: UserResponseDto,
  ): Promise<VisitorResponseDto> {
    const congregationId = await this.getCongregationId();
    const visitor = this.visitorsRepository.create({
      congregationId,
      createdByUserId: user.id,
      fullName: dto.fullName.trim(),
      phone: this.nullableText(dto.phone),
      visitDate: dto.visitDate,
      notes: this.nullableText(dto.notes),
      followUpDone: dto.followUpDone,
      memberId: dto.memberId ?? null,
    });
    const saved = await this.visitorsRepository.save(visitor);
    this.logger.log(`Visitante cadastrado: ${saved.id}`);
    return this.toDto(saved);
  }

  async findVisitors(
    query: QueryVisitorsDto,
  ): Promise<PaginatedVisitorsResponseDto> {
    const congregationId = await this.getCongregationId();
    const qb = this.visitorsRepository
      .createQueryBuilder('visitor')
      .where('visitor.congregationId = :congregationId', { congregationId });
    this.applyFilters(qb, query);
    qb.orderBy('visitor.visitDate', 'DESC')
      .addOrderBy('visitor.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [visitors, total] = await qb.getManyAndCount();
    return {
      data: visitors.map(this.toDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findVisitor(id: string): Promise<VisitorResponseDto> {
    const congregationId = await this.getCongregationId();
    return this.toDto(await this.getVisitorOrFail(id, congregationId));
  }

  async updateVisitor(
    id: string,
    dto: UpdateVisitorDto,
  ): Promise<VisitorResponseDto> {
    const congregationId = await this.getCongregationId();
    const visitor = await this.getVisitorOrFail(id, congregationId);
    if (dto.fullName !== undefined) visitor.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) visitor.phone = this.nullableText(dto.phone);
    if (dto.visitDate !== undefined) visitor.visitDate = dto.visitDate;
    if (dto.notes !== undefined) visitor.notes = this.nullableText(dto.notes);
    if (dto.followUpDone !== undefined) {
      visitor.followUpDone = dto.followUpDone;
    }
    if (dto.memberId !== undefined) visitor.memberId = dto.memberId ?? null;
    const saved = await this.visitorsRepository.save(visitor);
    this.logger.log(`Visitante atualizado: ${saved.id}`);
    return this.toDto(saved);
  }

  async convertToMember(
    id: string,
    dto: ConvertVisitorToMemberDto,
    user: UserResponseDto,
  ): Promise<ConvertVisitorToMemberResponseDto> {
    this.assertCanConvert(user);
    const congregationId = await this.getCongregationId();

    return this.dataSource.transaction(async (manager) => {
      const visitor = await manager.findOne(Visitor, {
        where: { id, congregationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!visitor) {
        throw new ApiException(HttpStatus.NOT_FOUND, {
          code: ApiErrorCode.SECRETARIAT_VISITOR_NOT_FOUND,
          message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_VISITOR_NOT_FOUND],
        });
      }
      if (visitor.memberId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.SECRETARIAT_VISITOR_ALREADY_CONVERTED,
          message:
            ApiErrorMessage[ApiErrorCode.SECRETARIAT_VISITOR_ALREADY_CONVERTED],
        });
      }

      const memberDto = this.buildMemberDto(visitor, dto);
      const member = await this.membersService.createInTransaction(
        manager,
        memberDto,
        congregationId,
      );

      visitor.memberId = member.id;
      visitor.followUpDone = true;
      const savedVisitor = await manager.save(visitor);
      this.logger.log(
        `Visitante ${savedVisitor.id} convertido em membro ${member.id}`,
      );

      return {
        visitor: this.toDto(savedVisitor),
        member: MemberResponseDto.fromEntity(member),
      };
    });
  }

  async removeVisitor(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.visitorsRepository.softRemove(
      await this.getVisitorOrFail(id, congregationId),
    );
    this.logger.log(`Visitante removido (soft delete): ${id}`);
  }

  private assertCanConvert(user: UserResponseDto): void {
    const granted = user.permissions?.includes('members:write') ?? false;
    if (!granted) {
      throw new ApiException(HttpStatus.FORBIDDEN, {
        code: ApiErrorCode.AUTH_FORBIDDEN,
        message: ApiErrorMessage[ApiErrorCode.AUTH_FORBIDDEN],
      });
    }
  }

  private buildMemberDto(
    visitor: Visitor,
    dto: ConvertVisitorToMemberDto,
  ): CreateMemberDto {
    const notesParts: string[] = [];
    if (visitor.notes) {
      notesParts.push(`[Visitante ${visitor.visitDate}] ${visitor.notes}`);
    }
    if (dto.notes?.trim()) {
      notesParts.push(dto.notes.trim());
    }

    return {
      fullName: dto.fullName?.trim() || visitor.fullName,
      phone: this.nullableText(dto.phone ?? visitor.phone) ?? undefined,
      email: dto.email,
      document: dto.document,
      membershipDate: dto.membershipDate ?? this.todayIso(),
      baptismDate: dto.baptismDate,
      notes: notesParts.length > 0 ? notesParts.join('\n\n') : undefined,
    };
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getVisitorOrFail(
    id: string,
    congregationId: string,
  ): Promise<Visitor> {
    const visitor = await this.visitorsRepository.findOne({
      where: { id, congregationId },
    });
    if (!visitor) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_VISITOR_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_VISITOR_NOT_FOUND],
      });
    }
    return visitor;
  }

  private applyFilters(
    qb: SelectQueryBuilder<Visitor>,
    query: QueryVisitorsDto,
  ): void {
    if (query.from) {
      qb.andWhere('visitor.visitDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('visitor.visitDate <= :to', { to: query.to });
    }
    if (query.followUpDone !== undefined) {
      qb.andWhere('visitor.followUpDone = :followUpDone', {
        followUpDone: query.followUpDone,
      });
    }
    if (query.search) {
      qb.andWhere(
        new Brackets((nested) => {
          nested
            .where('visitor.fullName LIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('visitor.phone LIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readonly toDto = (visitor: Visitor): VisitorResponseDto => ({
    id: visitor.id,
    congregationId: visitor.congregationId,
    createdByUserId: visitor.createdByUserId,
    fullName: visitor.fullName,
    phone: visitor.phone,
    visitDate: visitor.visitDate,
    notes: visitor.notes,
    followUpDone: Boolean(visitor.followUpDone),
    memberId: visitor.memberId,
    createdAt: visitor.createdAt,
    updatedAt: visitor.updatedAt,
  });
}
