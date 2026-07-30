import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { AddFamilyMemberDto } from './dto/add-family-member.dto';
import { CreateFamilyMemberRelationDto } from './dto/create-family-member-relation.dto';
import {
  BirthdayReportItemDto,
  BirthdayReportResponseDto,
} from './dto/birthday-report-item.dto';
import { CreateFamilyDto } from './dto/create-family.dto';
import { FamilyGenealogyResponseDto } from './dto/family-genealogy-response.dto';
import {
  FamilyMemberRelationListResponseDto,
  FamilyMemberRelationResponseDto,
} from './dto/family-member-relation-response.dto';
import { buildGenealogyForest } from './utils/family-genealogy.util';
import {
  FamilyResponseDto,
  PaginatedFamiliesResponseDto,
} from './dto/family-response.dto';
import {
  FamilyMemberResponseDto,
  PaginatedFamilyMembersResponseDto,
} from './dto/family-member-response.dto';
import { QueryFamiliesDto } from './dto/query-families.dto';
import { QueryFamilyBirthdaysDto } from './dto/query-family-birthdays.dto';
import { QueryFamilyMembersDto } from './dto/query-family-members.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import {
  FamilyLinkResultDto,
  FamilyLinkSkippedReason,
} from '../members/dto/family-link-result.dto';
import { FamilyMemberRelation } from './entities/family-member-relation.entity';
import { FamilyMember } from './entities/family-member.entity';
import { Family } from './entities/family.entity';
import { FamilyMemberLinkRelation } from './enums/family-member-link-relation.enum';
import { FamilyRelation } from './enums/family-relation.enum';
import { MemberGender } from '../members/enums/member-gender.enum';
import { normalizeSymmetricMemberIds } from './utils/family-relation-summary.util';

export interface LinkFiliationFamilyParams {
  childMemberId: string;
  fatherMemberId?: string | null;
  motherMemberId?: string | null;
  congregationId: string;
}

@Injectable()
export class FamiliesService {
  private readonly logger = new Logger(FamiliesService.name);

  constructor(
    @InjectRepository(Family)
    private readonly familiesRepository: Repository<Family>,
    @InjectRepository(FamilyMember)
    private readonly familyMembersRepository: Repository<FamilyMember>,
    @InjectRepository(FamilyMemberRelation)
    private readonly familyMemberRelationsRepository: Repository<FamilyMemberRelation>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateFamilyDto,
    activeCongregationId?: string,
  ): Promise<FamilyResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const name = dto.name.trim();
    if (!name) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_VALIDATION,
        message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
        details: [
          {
            field: 'name',
            code: ApiErrorCode.SYS_VALIDATION,
            message: 'Nome da família é obrigatório.',
          },
        ],
      });
    }

    let headMemberId: string | null = null;
    if (dto.headMemberId) {
      await this.assertHeadEligible(dto.headMemberId, congregationId);
      headMemberId = dto.headMemberId;
    }

    const family = this.familiesRepository.create({
      congregationId,
      name,
      notes: this.nullableText(dto.notes),
      headMemberId,
    });
    const saved = await this.familiesRepository.save(family);

    if (headMemberId) {
      await this.ensureMemberLinked(
        saved.id,
        headMemberId,
        FamilyRelation.OTHER,
      );
    }

    this.logger.log(`Família criada: ${saved.id} (${saved.name})`);
    return this.toFamilyResponse(
      await this.getFamilyOrFail(saved.id, true, activeCongregationId),
    );
  }

  async findAll(
    query: QueryFamiliesDto,
    activeCongregationId?: string,
  ): Promise<PaginatedFamiliesResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, search } = query;

    const qb = this.familiesRepository
      .createQueryBuilder('family')
      .leftJoinAndSelect('family.headMember', 'headMember')
      .loadRelationCountAndMap('family.membersCount', 'family.members')
      .where('family.congregationId = :congregationId', { congregationId })
      .orderBy('family.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('family.name LIKE :search', { search: `%${search}%` });
    }

    const [families, total] = await qb.getManyAndCount();
    return {
      data: families.map((family) =>
        FamilyResponseDto.fromEntity(family, {
          membersCount: (family as Family & { membersCount?: number })
            .membersCount,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findBirthdays(
    query: QueryFamilyBirthdaysDto,
    activeCongregationId?: string,
  ): Promise<BirthdayReportResponseDto> {
    const month = Number(query.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.FAMILIES_BIRTHDAY_MONTH_INVALID,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_BIRTHDAY_MONTH_INVALID],
      });
    }

    const congregationId = await this.getCongregationId(activeCongregationId);

    if (query.familyId) {
      await this.getFamilyOrFail(query.familyId, true, activeCongregationId);
    }

    const qb = this.familyMembersRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.member', 'member')
      .innerJoinAndSelect('link.family', 'family')
      .where('family.congregationId = :congregationId', { congregationId })
      .andWhere('family.deletedAt IS NULL')
      .andWhere('member.deletedAt IS NULL')
      .andWhere('member.birthDate IS NOT NULL')
      .andWhere('MONTH(member.birthDate) = :month', { month })
      .orderBy('DAY(member.birthDate)', 'ASC')
      .addOrderBy('member.fullName', 'ASC');

    if (query.familyId) {
      qb.andWhere('family.id = :familyId', { familyId: query.familyId });
    }

    const links = await qb.getMany();
    const data: BirthdayReportItemDto[] = links.map((link) => {
      const birthDate = link.member.birthDate as string;
      const day = Number(birthDate.slice(8, 10));
      return {
        memberId: link.memberId,
        fullName: link.member.fullName,
        birthDate,
        familyId: link.familyId,
        familyName: link.family.name,
        relation: link.relation,
        day,
      };
    });

    return { data };
  }

  async findByMemberId(
    memberId: string,
    activeCongregationId?: string,
  ): Promise<FamilyResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const member = await this.membersRepository.findOne({
      where: { id: memberId, congregationId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FAMILIES_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_NOT_FOUND],
      });
    }

    const link = await this.familyMembersRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.family', 'family')
      .leftJoinAndSelect('family.headMember', 'headMember')
      .where('link.memberId = :memberId', { memberId })
      .andWhere('family.deletedAt IS NULL')
      .getOne();
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FAMILIES_MEMBER_FAMILY_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_FAMILY_NOT_FOUND],
      });
    }

    const membersCount = await this.familyMembersRepository.count({
      where: { familyId: link.familyId },
    });
    return FamilyResponseDto.fromEntity(link.family, { membersCount });
  }

  async findOne(
    id: string,
    includeMembers = false,
    activeCongregationId?: string,
  ): Promise<FamilyResponseDto> {
    const family = await this.getFamilyOrFail(id, true, activeCongregationId);
    const response = this.toFamilyResponse(family);
    if (includeMembers) {
      response.membersCount = await this.familyMembersRepository.count({
        where: { familyId: id },
      });
    }
    return response;
  }

  async update(
    id: string,
    dto: UpdateFamilyDto,
    activeCongregationId?: string,
  ): Promise<FamilyResponseDto> {
    const family = await this.getFamilyOrFail(id, true, activeCongregationId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new ApiException(HttpStatus.BAD_REQUEST, {
          code: ApiErrorCode.SYS_VALIDATION,
          message: ApiErrorMessage[ApiErrorCode.SYS_VALIDATION],
          details: [
            {
              field: 'name',
              code: ApiErrorCode.SYS_VALIDATION,
              message: 'Nome da família é obrigatório.',
            },
          ],
        });
      }
      family.name = name;
    }
    if (dto.notes !== undefined) {
      family.notes = this.nullableText(dto.notes);
    }

    if (dto.headMemberId !== undefined) {
      if (dto.headMemberId === null || dto.headMemberId === '') {
        family.headMemberId = null;
      } else {
        await this.assertHeadEligible(dto.headMemberId, family.congregationId);
        family.headMemberId = dto.headMemberId;
        await this.ensureMemberLinked(
          family.id,
          dto.headMemberId,
          FamilyRelation.OTHER,
        );
      }
    }

    const saved = await this.familiesRepository.save(family);
    this.logger.log(`Família atualizada: ${saved.id}`);
    return this.toFamilyResponse(
      await this.getFamilyOrFail(saved.id, true, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const family = await this.getFamilyOrFail(id, true, activeCongregationId);

    await this.dataSource.transaction(async (manager) => {
      family.headMemberId = null;
      await manager.save(family);
      await manager.delete(FamilyMemberRelation, { familyId: id });
      await manager.delete(FamilyMember, { familyId: id });
      await manager.softRemove(family);
    });

    this.logger.log(`Família removida (soft delete + vínculos limpos): ${id}`);
  }

  async findMembers(
    familyId: string,
    query: QueryFamilyMembersDto,
    activeCongregationId?: string,
  ): Promise<PaginatedFamilyMembersResponseDto> {
    await this.getFamilyOrFail(familyId, true, activeCongregationId);
    const { page, limit } = query;

    const [links, total] = await this.familyMembersRepository.findAndCount({
      where: { familyId },
      relations: { member: true },
      order: { joinedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const familyRelations = await this.familyMemberRelationsRepository.find({
      where: { familyId },
      relations: { fromMember: true, toMember: true },
    });

    return {
      data: links.map((link) =>
        FamilyMemberResponseDto.fromEntity(link, { familyRelations }),
      ),
      total,
      page,
      limit,
    };
  }

  async findMemberRelations(
    familyId: string,
    activeCongregationId?: string,
  ): Promise<FamilyMemberRelationListResponseDto> {
    await this.getFamilyOrFail(familyId, true, activeCongregationId);
    const relations = await this.familyMemberRelationsRepository.find({
      where: { familyId },
      relations: { fromMember: true, toMember: true },
      order: { createdAt: 'ASC' },
    });
    return {
      data: relations.map((relation) =>
        FamilyMemberRelationResponseDto.fromEntity(relation),
      ),
    };
  }

  async getGenealogy(
    familyId: string,
    activeCongregationId?: string,
  ): Promise<FamilyGenealogyResponseDto> {
    const family = await this.getFamilyOrFail(
      familyId,
      true,
      activeCongregationId,
    );

    const [links, relations] = await Promise.all([
      this.familyMembersRepository.find({
        where: { familyId },
        relations: { member: true },
        order: { joinedAt: 'ASC' },
      }),
      this.familyMemberRelationsRepository.find({
        where: { familyId },
      }),
    ]);

    const forest = buildGenealogyForest(
      links.map((link) => ({
        memberId: link.memberId,
        fullName: link.member?.fullName ?? '',
        birthDate: link.member?.birthDate ?? null,
      })),
      relations.map((relation) => ({
        fromMemberId: relation.fromMemberId,
        toMemberId: relation.toMemberId,
        relation: relation.relation,
      })),
    );

    return FamilyGenealogyResponseDto.fromForest(
      family.id,
      family.name,
      forest,
    );
  }

  async createMemberRelation(
    familyId: string,
    dto: CreateFamilyMemberRelationDto,
    activeCongregationId?: string,
  ): Promise<FamilyMemberRelationResponseDto> {
    const family = await this.getFamilyOrFail(
      familyId,
      true,
      activeCongregationId,
    );

    const normalized = this.normalizeRelationPair(
      dto.fromMemberId,
      dto.toMemberId,
      dto.relation,
    );

    if (normalized.fromMemberId === normalized.toMemberId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FAMILIES_RELATION_SELF,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_SELF],
      });
    }

    await this.assertMembersBelongToFamily(familyId, [
      normalized.fromMemberId,
      normalized.toMemberId,
    ]);

    if (dto.relation === FamilyMemberLinkRelation.PARENT_OF) {
      await this.assertParentRelationAllowed(
        familyId,
        normalized.fromMemberId,
        normalized.toMemberId,
      );
    }

    const existing = await this.familyMemberRelationsRepository.findOne({
      where: {
        familyId,
        fromMemberId: normalized.fromMemberId,
        toMemberId: normalized.toMemberId,
        relation: dto.relation,
      },
    });
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.FAMILIES_RELATION_DUPLICATE,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_DUPLICATE],
      });
    }

    const relation = this.familyMemberRelationsRepository.create({
      familyId,
      fromMemberId: normalized.fromMemberId,
      toMemberId: normalized.toMemberId,
      relation: dto.relation,
    });

    let saved: FamilyMemberRelation;
    try {
      saved = await this.familyMemberRelationsRepository.save(relation);
    } catch (error) {
      this.rethrowRelationDuplicate(error);
    }

    if (dto.relation === FamilyMemberLinkRelation.PARENT_OF) {
      await this.syncChildFiliationFromParentEdge(
        normalized.toMemberId,
        normalized.fromMemberId,
      );
      await this.suggestFamilyMemberRole(
        familyId,
        normalized.fromMemberId,
        FamilyRelation.PARENT,
      );
      await this.suggestFamilyMemberRole(
        familyId,
        normalized.toMemberId,
        FamilyRelation.CHILD,
      );
    } else if (dto.relation === FamilyMemberLinkRelation.SPOUSE_OF) {
      await this.suggestFamilyMemberRole(
        familyId,
        normalized.fromMemberId,
        FamilyRelation.SPOUSE,
      );
      await this.suggestFamilyMemberRole(
        familyId,
        normalized.toMemberId,
        FamilyRelation.SPOUSE,
      );
    } else if (dto.relation === FamilyMemberLinkRelation.SIBLING_OF) {
      await this.suggestFamilyMemberRole(
        familyId,
        normalized.fromMemberId,
        FamilyRelation.SIBLING,
      );
      await this.suggestFamilyMemberRole(
        familyId,
        normalized.toMemberId,
        FamilyRelation.SIBLING,
      );
    }

    saved.fromMember = await this.membersRepository.findOneOrFail({
      where: { id: saved.fromMemberId },
    });
    saved.toMember = await this.membersRepository.findOneOrFail({
      where: { id: saved.toMemberId },
    });

    this.logger.log(
      `Relação ${saved.relation} criada na família ${familyId}: ${saved.fromMemberId} → ${saved.toMemberId}`,
    );
    void family;
    return FamilyMemberRelationResponseDto.fromEntity(saved);
  }

  async removeMemberRelation(
    familyId: string,
    relationId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    await this.getFamilyOrFail(familyId, true, activeCongregationId);
    const relation = await this.familyMemberRelationsRepository.findOne({
      where: { id: relationId, familyId },
    });
    if (!relation) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FAMILIES_RELATION_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_NOT_FOUND],
      });
    }

    if (relation.relation === FamilyMemberLinkRelation.PARENT_OF) {
      await this.clearChildFiliationFromParentEdge(
        relation.toMemberId,
        relation.fromMemberId,
      );
    }

    await this.familyMemberRelationsRepository.remove(relation);
    this.logger.log(`Relação ${relationId} removida da família ${familyId}`);
  }

  async syncFiliationRelationsForMember(
    memberId: string,
    fatherMemberId?: string | null,
    motherMemberId?: string | null,
  ): Promise<void> {
    const link = await this.familyMembersRepository.findOne({
      where: { memberId },
    });
    if (!link) {
      return;
    }

    const familyId = link.familyId;
    const parentIds = [fatherMemberId, motherMemberId].filter(
      (value): value is string => Boolean(value),
    );

    const existingParentEdges = await this.familyMemberRelationsRepository.find(
      {
        where: {
          familyId,
          toMemberId: memberId,
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
      },
    );

    for (const edge of existingParentEdges) {
      if (!parentIds.includes(edge.fromMemberId)) {
        await this.familyMemberRelationsRepository.remove(edge);
      }
    }

    for (const parentId of parentIds) {
      await this.ensureParentOfEdge(familyId, parentId, memberId);
    }
  }

  async addMember(
    familyId: string,
    dto: AddFamilyMemberDto,
    activeCongregationId?: string,
  ): Promise<FamilyMemberResponseDto> {
    const family = await this.getFamilyOrFail(
      familyId,
      true,
      activeCongregationId,
    );
    const member = await this.assertMemberEligible(
      dto.memberId,
      family.congregationId,
    );

    const existing = await this.familyMembersRepository.findOne({
      where: { memberId: dto.memberId },
    });
    if (existing) {
      if (existing.familyId === familyId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.FAMILIES_MEMBER_ALREADY_LINKED,
          message: ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_ALREADY_LINKED],
        });
      }
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY,
        message:
          ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY],
      });
    }

    const relation = dto.relation ?? FamilyRelation.OTHER;
    const link = this.familyMembersRepository.create({
      familyId,
      memberId: dto.memberId,
      relation,
      joinedAt: new Date(),
    });

    let saved: FamilyMember;
    try {
      saved = await this.familyMembersRepository.save(link);
    } catch (error) {
      this.rethrowMemberAlreadyInFamily(error);
    }

    saved.member = member;
    this.logger.log(`Membro ${dto.memberId} vinculado à família ${familyId}`);
    return FamilyMemberResponseDto.fromEntity(saved);
  }

  async updateMemberRelation(
    familyId: string,
    memberId: string,
    dto: UpdateFamilyMemberDto,
    activeCongregationId?: string,
  ): Promise<FamilyMemberResponseDto> {
    await this.getFamilyOrFail(familyId, true, activeCongregationId);
    const link = await this.getLinkOrFail(familyId, memberId);

    link.relation = dto.relation;
    const saved = await this.familyMembersRepository.save(link);

    if (!saved.member) {
      saved.member = await this.membersRepository.findOneOrFail({
        where: { id: memberId },
      });
    }

    const familyRelations = await this.familyMemberRelationsRepository.find({
      where: { familyId },
      relations: { fromMember: true, toMember: true },
    });

    return FamilyMemberResponseDto.fromEntity(saved, { familyRelations });
  }

  async removeMember(
    familyId: string,
    memberId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    const family = await this.getFamilyOrFail(
      familyId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(familyId, memberId);

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(FamilyMemberRelation)
        .where(
          'family_id = :familyId AND (from_member_id = :memberId OR to_member_id = :memberId)',
          { familyId, memberId },
        )
        .execute();
      await manager.remove(link);
    });

    if (family.headMemberId === memberId) {
      family.headMemberId = null;
      await this.familiesRepository.save(family);
    }

    this.logger.log(`Membro ${memberId} desvinculado da família ${familyId}`);
  }

  /**
   * Orquestra criação/vínculo familiar a partir da filiação (pai/mãe).
   * Best-effort: conflitos retornam skippedReason sem lançar exceção.
   */
  async linkFiliationFamily(
    params: LinkFiliationFamilyParams,
  ): Promise<FamilyLinkResultDto> {
    const { childMemberId, congregationId } = params;
    const fatherMemberId = params.fatherMemberId ?? null;
    const motherMemberId = params.motherMemberId ?? null;

    if (!fatherMemberId && !motherMemberId) {
      return { attempted: false, linked: false };
    }

    try {
      const child = await this.assertMemberEligible(
        childMemberId,
        congregationId,
      );
      const father = fatherMemberId
        ? await this.assertMemberEligible(fatherMemberId, congregationId)
        : null;
      const mother = motherMemberId
        ? await this.assertMemberEligible(motherMemberId, congregationId)
        : null;

      const childFamilyId =
        await this.findActiveFamilyIdForMember(childMemberId);
      const fatherFamilyId = fatherMemberId
        ? await this.findActiveFamilyIdForMember(fatherMemberId)
        : null;
      const motherFamilyId = motherMemberId
        ? await this.findActiveFamilyIdForMember(motherMemberId)
        : null;

      if (
        fatherFamilyId &&
        motherFamilyId &&
        fatherFamilyId !== motherFamilyId
      ) {
        return this.skipFamilyLink('PARENTS_IN_DIFFERENT_FAMILIES');
      }

      let targetFamilyId: string | null = childFamilyId;
      if (!targetFamilyId) {
        targetFamilyId = fatherFamilyId ?? motherFamilyId ?? null;
      }

      if (targetFamilyId) {
        if (fatherFamilyId && fatherFamilyId !== targetFamilyId) {
          return this.skipFamilyLink(
            childFamilyId
              ? 'CHILD_IN_OTHER_FAMILY'
              : 'PARENTS_IN_DIFFERENT_FAMILIES',
          );
        }
        if (motherFamilyId && motherFamilyId !== targetFamilyId) {
          return this.skipFamilyLink(
            childFamilyId
              ? 'CHILD_IN_OTHER_FAMILY'
              : 'PARENTS_IN_DIFFERENT_FAMILIES',
          );
        }
        if (childFamilyId && childFamilyId !== targetFamilyId) {
          return this.skipFamilyLink('CHILD_IN_OTHER_FAMILY');
        }
      }

      let family: Family;
      if (targetFamilyId) {
        family = await this.getFamilyOrFail(
          targetFamilyId,
          true,
          congregationId,
        );
      } else {
        const surnameSource =
          father?.fullName ?? mother?.fullName ?? child.fullName;
        const surname = this.extractSurname(surnameSource);
        const familyName = `Família ${surname}`.slice(0, 120);
        const headMemberId = fatherMemberId ?? motherMemberId;
        const created = this.familiesRepository.create({
          congregationId,
          name: familyName,
          notes: null,
          headMemberId,
        });
        family = await this.familiesRepository.save(created);
        this.logger.log(
          `Família criada por filiação: ${family.id} (${family.name})`,
        );
      }

      await this.ensureMemberLinked(
        family.id,
        childMemberId,
        FamilyRelation.CHILD,
      );
      if (fatherMemberId) {
        await this.ensureMemberLinked(
          family.id,
          fatherMemberId,
          FamilyRelation.PARENT,
        );
      }
      if (motherMemberId) {
        await this.ensureMemberLinked(
          family.id,
          motherMemberId,
          FamilyRelation.PARENT,
        );
      }

      if (fatherMemberId) {
        await this.ensureParentOfEdge(family.id, fatherMemberId, childMemberId);
      }
      if (motherMemberId) {
        await this.ensureParentOfEdge(family.id, motherMemberId, childMemberId);
      }

      return {
        attempted: true,
        linked: true,
        familyId: family.id,
        familyName: family.name,
      };
    } catch (error) {
      if (
        error instanceof ApiException &&
        error.getStatus() === Number(HttpStatus.CONFLICT)
      ) {
        return this.skipFamilyLink('MEMBER_ALREADY_IN_OTHER_FAMILY');
      }
      this.logger.warn(
        `Orquestração familiar falhou para membro ${childMemberId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.skipFamilyLink('MEMBER_ALREADY_IN_OTHER_FAMILY');
    }
  }

  private skipFamilyLink(
    skippedReason: FamilyLinkSkippedReason,
  ): FamilyLinkResultDto {
    return {
      attempted: true,
      linked: false,
      skippedReason,
    };
  }

  private extractSurname(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : 'Sem Nome';
  }

  private async findActiveFamilyIdForMember(
    memberId: string,
  ): Promise<string | null> {
    const link = await this.familyMembersRepository
      .createQueryBuilder('link')
      .innerJoin('link.family', 'family')
      .where('link.memberId = :memberId', { memberId })
      .andWhere('family.deletedAt IS NULL')
      .getOne();
    return link?.familyId ?? null;
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getFamilyOrFail(
    id: string,
    withHead = true,
    activeCongregationId?: string,
  ): Promise<Family> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const family = await this.familiesRepository.findOne({
      where: { id, congregationId },
      relations: withHead ? { headMember: true } : undefined,
    });
    if (!family) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FAMILIES_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_NOT_FOUND],
      });
    }
    return family;
  }

  private async getLinkOrFail(
    familyId: string,
    memberId: string,
  ): Promise<FamilyMember> {
    const link = await this.familyMembersRepository.findOne({
      where: { familyId, memberId },
      relations: { member: true },
    });
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.FAMILIES_MEMBER_LINK_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_LINK_NOT_FOUND],
      });
    }
    return link;
  }

  private async assertHeadEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FAMILIES_HEAD_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_HEAD_NOT_FOUND],
        details: [
          {
            field: 'headMemberId',
            code: ApiErrorCode.FAMILIES_HEAD_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.FAMILIES_HEAD_NOT_FOUND],
          },
        ],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FAMILIES_HEAD_WRONG_CONGREGATION,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_HEAD_WRONG_CONGREGATION],
        details: [
          {
            field: 'headMemberId',
            code: ApiErrorCode.FAMILIES_HEAD_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[ApiErrorCode.FAMILIES_HEAD_WRONG_CONGREGATION],
          },
        ],
      });
    }
    return member;
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
        code: ApiErrorCode.FAMILIES_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FAMILIES_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_WRONG_CONGREGATION],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.FAMILIES_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_WRONG_CONGREGATION],
          },
        ],
      });
    }
    return member;
  }

  private async ensureMemberLinked(
    familyId: string,
    memberId: string,
    relation: FamilyRelation,
  ): Promise<void> {
    const existing = await this.familyMembersRepository.findOne({
      where: { memberId },
    });
    if (existing) {
      if (existing.familyId !== familyId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY,
          message:
            ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY],
        });
      }
      return;
    }

    const link = this.familyMembersRepository.create({
      familyId,
      memberId,
      relation,
      joinedAt: new Date(),
    });
    try {
      await this.familyMembersRepository.save(link);
    } catch (error) {
      this.rethrowMemberAlreadyInFamily(error);
    }
  }

  private toFamilyResponse(family: Family): FamilyResponseDto {
    return FamilyResponseDto.fromEntity(family);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private rethrowMemberAlreadyInFamily(error: unknown): never {
    if (this.isDuplicate(error)) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY,
        message:
          ApiErrorMessage[ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY],
      });
    }
    throw error;
  }

  private rethrowRelationDuplicate(error: unknown): never {
    if (this.isDuplicate(error)) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.FAMILIES_RELATION_DUPLICATE,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_DUPLICATE],
      });
    }
    throw error;
  }

  private normalizeRelationPair(
    fromMemberId: string,
    toMemberId: string,
    relation: FamilyMemberLinkRelation,
  ): { fromMemberId: string; toMemberId: string } {
    if (
      relation === FamilyMemberLinkRelation.SPOUSE_OF ||
      relation === FamilyMemberLinkRelation.SIBLING_OF
    ) {
      return normalizeSymmetricMemberIds(fromMemberId, toMemberId);
    }
    return { fromMemberId, toMemberId };
  }

  private async assertMembersBelongToFamily(
    familyId: string,
    memberIds: string[],
  ): Promise<void> {
    for (const memberId of memberIds) {
      const link = await this.familyMembersRepository.findOne({
        where: { familyId, memberId },
      });
      if (!link) {
        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
          code: ApiErrorCode.FAMILIES_RELATION_NOT_IN_FAMILY,
          message:
            ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_NOT_IN_FAMILY],
          details: [
            {
              field: 'memberId',
              code: ApiErrorCode.FAMILIES_RELATION_NOT_IN_FAMILY,
              message:
                ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_NOT_IN_FAMILY],
            },
          ],
        });
      }
    }
  }

  private async assertParentRelationAllowed(
    familyId: string,
    parentMemberId: string,
    childMemberId: string,
  ): Promise<void> {
    const parentCount = await this.familyMemberRelationsRepository.count({
      where: {
        familyId,
        toMemberId: childMemberId,
        relation: FamilyMemberLinkRelation.PARENT_OF,
      },
    });
    const existingParent = await this.familyMemberRelationsRepository.findOne({
      where: {
        familyId,
        fromMemberId: parentMemberId,
        toMemberId: childMemberId,
        relation: FamilyMemberLinkRelation.PARENT_OF,
      },
    });
    if (!existingParent && parentCount >= 2) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FAMILIES_RELATION_MAX_PARENTS,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_MAX_PARENTS],
      });
    }

    if (await this.hasParentCycle(familyId, parentMemberId, childMemberId)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.FAMILIES_RELATION_CYCLE,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_RELATION_CYCLE],
      });
    }
  }

  private async hasParentCycle(
    familyId: string,
    parentMemberId: string,
    childMemberId: string,
  ): Promise<boolean> {
    if (parentMemberId === childMemberId) {
      return true;
    }

    const visited = new Set<string>();
    const queue = [parentMemberId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === childMemberId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const ancestors = await this.familyMemberRelationsRepository.find({
        where: {
          familyId,
          toMemberId: current,
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
      });
      for (const edge of ancestors) {
        if (!visited.has(edge.fromMemberId)) {
          queue.push(edge.fromMemberId);
        }
      }
    }

    return false;
  }

  private async ensureParentOfEdge(
    familyId: string,
    parentMemberId: string,
    childMemberId: string,
  ): Promise<void> {
    if (parentMemberId === childMemberId) {
      return;
    }

    await this.assertMembersBelongToFamily(familyId, [
      parentMemberId,
      childMemberId,
    ]);

    const existing = await this.familyMemberRelationsRepository.findOne({
      where: {
        familyId,
        fromMemberId: parentMemberId,
        toMemberId: childMemberId,
        relation: FamilyMemberLinkRelation.PARENT_OF,
      },
    });
    if (existing) {
      return;
    }

    try {
      await this.assertParentRelationAllowed(
        familyId,
        parentMemberId,
        childMemberId,
      );
    } catch (error) {
      if (error instanceof ApiException) {
        this.logger.warn(
          `Sync parent_of ignorado (${parentMemberId} → ${childMemberId}): ${error.message}`,
        );
        return;
      }
      throw error;
    }

    const relation = this.familyMemberRelationsRepository.create({
      familyId,
      fromMemberId: parentMemberId,
      toMemberId: childMemberId,
      relation: FamilyMemberLinkRelation.PARENT_OF,
    });

    try {
      await this.familyMemberRelationsRepository.save(relation);
    } catch (error) {
      this.rethrowRelationDuplicate(error);
    }
  }

  private async syncChildFiliationFromParentEdge(
    childMemberId: string,
    parentMemberId: string,
  ): Promise<void> {
    const child = await this.membersRepository.findOne({
      where: { id: childMemberId },
    });
    const parent = await this.membersRepository.findOne({
      where: { id: parentMemberId },
    });
    if (!child || !parent) {
      return;
    }

    if (parent.gender === MemberGender.MALE) {
      child.fatherMemberId = parentMemberId;
    } else if (parent.gender === MemberGender.FEMALE) {
      child.motherMemberId = parentMemberId;
    } else if (!child.fatherMemberId) {
      child.fatherMemberId = parentMemberId;
    } else if (!child.motherMemberId) {
      child.motherMemberId = parentMemberId;
    }

    await this.membersRepository.save(child);
  }

  private async clearChildFiliationFromParentEdge(
    childMemberId: string,
    parentMemberId: string,
  ): Promise<void> {
    const child = await this.membersRepository.findOne({
      where: { id: childMemberId },
    });
    if (!child) {
      return;
    }

    if (child.fatherMemberId === parentMemberId) {
      child.fatherMemberId = null;
    }
    if (child.motherMemberId === parentMemberId) {
      child.motherMemberId = null;
    }

    await this.membersRepository.save(child);
  }

  private async suggestFamilyMemberRole(
    familyId: string,
    memberId: string,
    relation: FamilyRelation,
  ): Promise<void> {
    const link = await this.familyMembersRepository.findOne({
      where: { familyId, memberId },
    });
    if (!link || link.relation !== FamilyRelation.OTHER) {
      return;
    }

    link.relation = relation;
    await this.familyMembersRepository.save(link);
  }
}
