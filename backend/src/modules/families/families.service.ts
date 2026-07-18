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
import {
  BirthdayReportItemDto,
  BirthdayReportResponseDto,
} from './dto/birthday-report-item.dto';
import { CreateFamilyDto } from './dto/create-family.dto';
import {
  FamilyMemberResponseDto,
  PaginatedFamilyMembersResponseDto,
} from './dto/family-member-response.dto';
import {
  FamilyResponseDto,
  PaginatedFamiliesResponseDto,
} from './dto/family-response.dto';
import { QueryFamiliesDto } from './dto/query-families.dto';
import { QueryFamilyBirthdaysDto } from './dto/query-family-birthdays.dto';
import { QueryFamilyMembersDto } from './dto/query-family-members.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamilyMember } from './entities/family-member.entity';
import { Family } from './entities/family.entity';
import { FamilyRelation } from './enums/family-relation.enum';

@Injectable()
export class FamiliesService {
  private readonly logger = new Logger(FamiliesService.name);

  constructor(
    @InjectRepository(Family)
    private readonly familiesRepository: Repository<Family>,
    @InjectRepository(FamilyMember)
    private readonly familyMembersRepository: Repository<FamilyMember>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateFamilyDto): Promise<FamilyResponseDto> {
    const congregationId = await this.getCongregationId();
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
    return this.toFamilyResponse(await this.getFamilyOrFail(saved.id));
  }

  async findAll(
    query: QueryFamiliesDto,
  ): Promise<PaginatedFamiliesResponseDto> {
    const congregationId = await this.getCongregationId();
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
  ): Promise<BirthdayReportResponseDto> {
    const month = Number(query.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.FAMILIES_BIRTHDAY_MONTH_INVALID,
        message: ApiErrorMessage[ApiErrorCode.FAMILIES_BIRTHDAY_MONTH_INVALID],
      });
    }

    const congregationId = await this.getCongregationId();

    if (query.familyId) {
      await this.getFamilyOrFail(query.familyId);
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

  async findByMemberId(memberId: string): Promise<FamilyResponseDto> {
    const congregationId = await this.getCongregationId();
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
  ): Promise<FamilyResponseDto> {
    const family = await this.getFamilyOrFail(id, true);
    const response = this.toFamilyResponse(family);
    if (includeMembers) {
      response.membersCount = await this.familyMembersRepository.count({
        where: { familyId: id },
      });
    }
    return response;
  }

  async update(id: string, dto: UpdateFamilyDto): Promise<FamilyResponseDto> {
    const family = await this.getFamilyOrFail(id);

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
    return this.toFamilyResponse(await this.getFamilyOrFail(saved.id));
  }

  async remove(id: string): Promise<void> {
    const family = await this.getFamilyOrFail(id);

    await this.dataSource.transaction(async (manager) => {
      family.headMemberId = null;
      await manager.save(family);
      await manager.delete(FamilyMember, { familyId: id });
      await manager.softRemove(family);
    });

    this.logger.log(`Família removida (soft delete + vínculos limpos): ${id}`);
  }

  async findMembers(
    familyId: string,
    query: QueryFamilyMembersDto,
  ): Promise<PaginatedFamilyMembersResponseDto> {
    await this.getFamilyOrFail(familyId);
    const { page, limit } = query;

    const [links, total] = await this.familyMembersRepository.findAndCount({
      where: { familyId },
      relations: { member: true },
      order: { joinedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: links.map((link) => FamilyMemberResponseDto.fromEntity(link)),
      total,
      page,
      limit,
    };
  }

  async addMember(
    familyId: string,
    dto: AddFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    const family = await this.getFamilyOrFail(familyId);
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
  ): Promise<FamilyMemberResponseDto> {
    await this.getFamilyOrFail(familyId);
    const link = await this.getLinkOrFail(familyId, memberId);

    link.relation = dto.relation;
    const saved = await this.familyMembersRepository.save(link);

    if (!saved.member) {
      saved.member = await this.membersRepository.findOneOrFail({
        where: { id: memberId },
      });
    }

    return FamilyMemberResponseDto.fromEntity(saved);
  }

  async removeMember(familyId: string, memberId: string): Promise<void> {
    const family = await this.getFamilyOrFail(familyId);
    const link = await this.getLinkOrFail(familyId, memberId);

    await this.familyMembersRepository.remove(link);

    if (family.headMemberId === memberId) {
      family.headMemberId = null;
      await this.familiesRepository.save(family);
    }

    this.logger.log(`Membro ${memberId} desvinculado da família ${familyId}`);
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getFamilyOrFail(id: string, withHead = true): Promise<Family> {
    const congregationId = await this.getCongregationId();
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
}
