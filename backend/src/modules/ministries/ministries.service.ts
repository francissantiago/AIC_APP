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
import { AddMinistryMemberDto } from './dto/add-ministry-member.dto';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import {
  MinistryMemberResponseDto,
  PaginatedMinistryMembersResponseDto,
} from './dto/ministry-member-response.dto';
import {
  MinistryResponseDto,
  PaginatedMinistriesResponseDto,
} from './dto/ministry-response.dto';
import { QueryMinistriesDto } from './dto/query-ministries.dto';
import { QueryMinistryMembersDto } from './dto/query-ministry-members.dto';
import { UpdateMinistryMemberDto } from './dto/update-ministry-member.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { MinistryMember } from './entities/ministry-member.entity';
import { Ministry } from './entities/ministry.entity';
import { MinistryMemberRole } from './enums/ministry-member-role.enum';
import { MinistryStatus } from './enums/ministry-status.enum';

@Injectable()
export class MinistriesService {
  private readonly logger = new Logger(MinistriesService.name);

  constructor(
    @InjectRepository(Ministry)
    private readonly ministriesRepository: Repository<Ministry>,
    @InjectRepository(MinistryMember)
    private readonly ministryMembersRepository: Repository<MinistryMember>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(
    dto: CreateMinistryDto,
    activeCongregationId?: string,
  ): Promise<MinistryResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const name = dto.name.trim();
    await this.assertNameAvailable(congregationId, name);

    let leaderMemberId: string | null = null;
    if (dto.leaderMemberId) {
      await this.assertLeaderEligible(dto.leaderMemberId, congregationId);
      leaderMemberId = dto.leaderMemberId;
    }

    const ministry = this.ministriesRepository.create({
      congregationId,
      name,
      description: this.nullableText(dto.description),
      leaderMemberId,
      status: dto.status ?? MinistryStatus.ACTIVE,
    });
    const saved = await this.ministriesRepository.save(ministry);

    if (leaderMemberId) {
      await this.upsertLeaderLink(saved.id, leaderMemberId);
    }

    this.logger.log(`Ministério criado: ${saved.id} (${saved.name})`);
    return this.toMinistryResponse(
      await this.getMinistryOrFail(saved.id, true, activeCongregationId),
    );
  }

  async findAll(
    query: QueryMinistriesDto,
    activeCongregationId?: string,
  ): Promise<PaginatedMinistriesResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status, memberId } = query;

    const qb = this.ministriesRepository
      .createQueryBuilder('ministry')
      .leftJoinAndSelect('ministry.leaderMember', 'leaderMember')
      .loadRelationCountAndMap('ministry.membersCount', 'ministry.members')
      .where('ministry.congregationId = :congregationId', { congregationId })
      .orderBy('ministry.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('ministry.status = :status', { status });
    }
    if (q) {
      qb.andWhere('ministry.name LIKE :q', { q: `%${q}%` });
    }
    if (memberId) {
      qb.innerJoin(
        'ministry.members',
        'memberFilter',
        'memberFilter.memberId = :memberId',
        { memberId },
      );
    }

    const [ministries, total] = await qb.getManyAndCount();
    return {
      data: ministries.map((ministry) =>
        MinistryResponseDto.fromEntity(ministry, {
          membersCount: (ministry as Ministry & { membersCount?: number })
            .membersCount,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    includeMembers = false,
    activeCongregationId?: string,
  ): Promise<MinistryResponseDto> {
    const ministry = await this.getMinistryOrFail(
      id,
      true,
      activeCongregationId,
    );
    const response = this.toMinistryResponse(ministry);
    if (includeMembers) {
      const count = await this.ministryMembersRepository.count({
        where: { ministryId: id },
      });
      response.membersCount = count;
    }
    return response;
  }

  async update(
    id: string,
    dto: UpdateMinistryDto,
    activeCongregationId?: string,
  ): Promise<MinistryResponseDto> {
    const ministry = await this.getMinistryOrFail(
      id,
      true,
      activeCongregationId,
    );

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== ministry.name) {
        await this.assertNameAvailable(ministry.congregationId, name, id);
      }
      ministry.name = name;
    }
    if (dto.description !== undefined) {
      ministry.description = this.nullableText(dto.description);
    }
    if (dto.status !== undefined) {
      ministry.status = dto.status;
    }

    if (dto.leaderMemberId !== undefined) {
      if (dto.leaderMemberId === null || dto.leaderMemberId === '') {
        ministry.leaderMemberId = null;
      } else {
        await this.assertLeaderEligible(
          dto.leaderMemberId,
          ministry.congregationId,
        );
        ministry.leaderMemberId = dto.leaderMemberId;
        await this.upsertLeaderLink(ministry.id, dto.leaderMemberId);
      }
    }

    const saved = await this.ministriesRepository.save(ministry);
    this.logger.log(`Ministério atualizado: ${saved.id}`);
    return this.toMinistryResponse(
      await this.getMinistryOrFail(saved.id, true, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const ministry = await this.getMinistryOrFail(
      id,
      true,
      activeCongregationId,
    );
    await this.ministriesRepository.softRemove(ministry);
    this.logger.log(`Ministério removido (soft delete): ${id}`);
  }

  async findMembers(
    ministryId: string,
    query: QueryMinistryMembersDto,
    activeCongregationId?: string,
  ): Promise<PaginatedMinistryMembersResponseDto> {
    await this.getMinistryOrFail(ministryId, true, activeCongregationId);
    const { page, limit } = query;

    const [links, total] = await this.ministryMembersRepository.findAndCount({
      where: { ministryId },
      relations: { member: true },
      order: { joinedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: links.map((link) => MinistryMemberResponseDto.fromEntity(link)),
      total,
      page,
      limit,
    };
  }

  async addMember(
    ministryId: string,
    dto: AddMinistryMemberDto,
    activeCongregationId?: string,
  ): Promise<MinistryMemberResponseDto> {
    const ministry = await this.getMinistryOrFail(
      ministryId,
      true,
      activeCongregationId,
    );
    const member = await this.assertMemberEligible(
      dto.memberId,
      ministry.congregationId,
    );

    const existing = await this.ministryMembersRepository.findOne({
      where: { ministryId, memberId: dto.memberId },
    });
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MINISTRIES_MEMBER_ALREADY_LINKED,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_MEMBER_ALREADY_LINKED],
      });
    }

    const role = dto.role ?? MinistryMemberRole.MEMBER;
    const link = this.ministryMembersRepository.create({
      ministryId,
      memberId: dto.memberId,
      role,
      joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
    });
    const saved = await this.ministryMembersRepository.save(link);

    if (role === MinistryMemberRole.LEADER && !ministry.leaderMemberId) {
      ministry.leaderMemberId = dto.memberId;
      await this.ministriesRepository.save(ministry);
    }

    saved.member = member;
    this.logger.log(
      `Membro ${dto.memberId} vinculado ao ministério ${ministryId}`,
    );
    return MinistryMemberResponseDto.fromEntity(saved);
  }

  async updateMemberRole(
    ministryId: string,
    memberId: string,
    dto: UpdateMinistryMemberDto,
    activeCongregationId?: string,
  ): Promise<MinistryMemberResponseDto> {
    const ministry = await this.getMinistryOrFail(
      ministryId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(ministryId, memberId);

    link.role = dto.role;
    const saved = await this.ministryMembersRepository.save(link);

    if (dto.role === MinistryMemberRole.LEADER && !ministry.leaderMemberId) {
      ministry.leaderMemberId = memberId;
      await this.ministriesRepository.save(ministry);
    }

    if (!saved.member) {
      saved.member = await this.membersRepository.findOneOrFail({
        where: { id: memberId },
      });
    }

    return MinistryMemberResponseDto.fromEntity(saved);
  }

  async removeMember(
    ministryId: string,
    memberId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    const ministry = await this.getMinistryOrFail(
      ministryId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(ministryId, memberId);

    await this.ministryMembersRepository.remove(link);

    if (ministry.leaderMemberId === memberId) {
      ministry.leaderMemberId = null;
      await this.ministriesRepository.save(ministry);
    }

    this.logger.log(
      `Membro ${memberId} desvinculado do ministério ${ministryId}`,
    );
  }

  async findByMemberId(
    memberId: string,
    activeCongregationId?: string,
  ): Promise<MinistryResponseDto[]> {
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

    const ministries = await this.ministriesRepository
      .createQueryBuilder('ministry')
      .leftJoinAndSelect('ministry.leaderMember', 'leaderMember')
      .loadRelationCountAndMap('ministry.membersCount', 'ministry.members')
      .innerJoin('ministry.members', 'link', 'link.memberId = :memberId', {
        memberId,
      })
      .where('ministry.congregationId = :congregationId', { congregationId })
      .orderBy('ministry.name', 'ASC')
      .getMany();

    return ministries.map((ministry) =>
      MinistryResponseDto.fromEntity(ministry, {
        membersCount: (ministry as Ministry & { membersCount?: number })
          .membersCount,
      }),
    );
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getMinistryOrFail(
    id: string,
    withLeader = true,
    activeCongregationId?: string,
  ): Promise<Ministry> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const ministry = await this.ministriesRepository.findOne({
      where: { id, congregationId },
      relations: withLeader ? { leaderMember: true } : undefined,
    });
    if (!ministry) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MINISTRIES_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_NOT_FOUND],
      });
    }
    return ministry;
  }

  private async getLinkOrFail(
    ministryId: string,
    memberId: string,
  ): Promise<MinistryMember> {
    const link = await this.ministryMembersRepository.findOne({
      where: { ministryId, memberId },
      relations: { member: true },
    });
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MINISTRIES_MEMBER_LINK_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_MEMBER_LINK_NOT_FOUND],
      });
    }
    return link;
  }

  private async assertNameAvailable(
    congregationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.ministriesRepository.findOne({
      where: { congregationId, name },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MINISTRIES_NAME_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_NAME_IN_USE],
        details: [
          {
            field: 'name',
            code: ApiErrorCode.MINISTRIES_NAME_IN_USE,
            message: ApiErrorMessage[ApiErrorCode.MINISTRIES_NAME_IN_USE],
          },
        ],
      });
    }
  }

  private async assertLeaderEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND],
        details: [
          {
            field: 'leaderMemberId',
            code: ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND],
          },
        ],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MINISTRIES_LEADER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.MINISTRIES_LEADER_WRONG_CONGREGATION],
        details: [
          {
            field: 'leaderMemberId',
            code: ApiErrorCode.MINISTRIES_LEADER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[
                ApiErrorCode.MINISTRIES_LEADER_WRONG_CONGREGATION
              ],
          },
        ],
      });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND],
        details: [
          {
            field: 'leaderMemberId',
            code: ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND],
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
        code: ApiErrorCode.MINISTRIES_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MINISTRIES_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MINISTRIES_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.MINISTRIES_MEMBER_WRONG_CONGREGATION],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.MINISTRIES_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[
                ApiErrorCode.MINISTRIES_MEMBER_WRONG_CONGREGATION
              ],
          },
        ],
      });
    }
    return member;
  }

  private async upsertLeaderLink(
    ministryId: string,
    memberId: string,
  ): Promise<void> {
    const existing = await this.ministryMembersRepository.findOne({
      where: { ministryId, memberId },
    });
    if (existing) {
      if (existing.role !== MinistryMemberRole.LEADER) {
        existing.role = MinistryMemberRole.LEADER;
        await this.ministryMembersRepository.save(existing);
      }
      return;
    }
    const link = this.ministryMembersRepository.create({
      ministryId,
      memberId,
      role: MinistryMemberRole.LEADER,
      joinedAt: new Date(),
    });
    await this.ministryMembersRepository.save(link);
  }

  private toMinistryResponse(ministry: Ministry): MinistryResponseDto {
    return MinistryResponseDto.fromEntity(ministry);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
