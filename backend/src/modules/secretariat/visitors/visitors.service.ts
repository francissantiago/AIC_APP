import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
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

  async removeVisitor(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.visitorsRepository.softRemove(
      await this.getVisitorOrFail(id, congregationId),
    );
    this.logger.log(`Visitante removido (soft delete): ${id}`);
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
    if (!visitor) throw new NotFoundException(`Visitante ${id} não encontrado`);
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
