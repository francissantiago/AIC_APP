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
import { AddSmallGroupMemberDto } from './dto/add-small-group-member.dto';
import { CreateSmallGroupMeetingDto } from './dto/create-small-group-meeting.dto';
import { CreateSmallGroupDto } from './dto/create-small-group.dto';
import { QueryLeaderOptionsDto } from './dto/query-leader-options.dto';
import { QueryMemberOptionsDto } from './dto/query-member-options.dto';
import { QuerySmallGroupFrequencyDto } from './dto/query-small-group-frequency.dto';
import { QuerySmallGroupMeetingsDto } from './dto/query-small-group-meetings.dto';
import { QuerySmallGroupMembersDto } from './dto/query-small-group-members.dto';
import { QuerySmallGroupsDto } from './dto/query-small-groups.dto';
import { SmallGroupMeetingAttendanceDto } from './dto/small-group-attendance-response.dto';
import { SmallGroupFrequencyReportDto } from './dto/small-group-frequency-response.dto';
import {
  PaginatedSmallGroupMeetingsResponseDto,
  SmallGroupMeetingResponseDto,
} from './dto/small-group-meeting-response.dto';
import {
  PaginatedSmallGroupMembersResponseDto,
  SmallGroupMemberOptionDto,
  SmallGroupMemberResponseDto,
} from './dto/small-group-member-response.dto';
import {
  PaginatedSmallGroupsResponseDto,
  SmallGroupLeaderOptionDto,
  SmallGroupResponseDto,
} from './dto/small-group-response.dto';
import { UpdateSmallGroupMeetingDto } from './dto/update-small-group-meeting.dto';
import { UpdateSmallGroupMemberDto } from './dto/update-small-group-member.dto';
import { UpdateSmallGroupDto } from './dto/update-small-group.dto';
import {
  UpsertSmallGroupAttendanceDto,
  UpsertSmallGroupAttendanceEntryDto,
} from './dto/upsert-small-group-attendance.dto';
import { SmallGroupAttendance } from './entities/small-group-attendance.entity';
import { SmallGroupMeeting } from './entities/small-group-meeting.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupMemberRole } from './enums/small-group-member-role.enum';
import { SmallGroupMemberStatus } from './enums/small-group-member-status.enum';
import { SmallGroupStatus } from './enums/small-group-status.enum';

@Injectable()
export class SmallGroupsService {
  private readonly logger = new Logger(SmallGroupsService.name);

  constructor(
    @InjectRepository(SmallGroup)
    private readonly groupsRepository: Repository<SmallGroup>,
    @InjectRepository(SmallGroupMember)
    private readonly membersRepository: Repository<SmallGroupMember>,
    @InjectRepository(SmallGroupMeeting)
    private readonly meetingsRepository: Repository<SmallGroupMeeting>,
    @InjectRepository(SmallGroupAttendance)
    private readonly attendanceRepository: Repository<SmallGroupAttendance>,
    @InjectRepository(Member)
    private readonly churchMembersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(
    dto: CreateSmallGroupDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const name = dto.name.trim();
    await this.assertNameAvailable(congregationId, name);

    let leaderMemberId: string | null = null;
    if (dto.leaderMemberId) {
      await this.assertLeaderEligible(dto.leaderMemberId, congregationId);
      leaderMemberId = dto.leaderMemberId;
    }

    const group = this.groupsRepository.create({
      congregationId,
      name,
      description: this.nullableText(dto.description),
      leaderMemberId,
      address: this.nullableText(dto.address),
      dayOfWeek: dto.dayOfWeek ?? 0,
      startTime: dto.startTime ?? null,
      status: dto.status ?? SmallGroupStatus.ACTIVE,
    });
    const saved = await this.groupsRepository.save(group);

    if (leaderMemberId) {
      await this.syncLeaderLink(saved.id, leaderMemberId, null);
    }

    this.logger.log(`Pequeno grupo criado: ${saved.id} (${saved.name})`);
    return this.toGroupResponse(
      await this.getGroupOrFail(saved.id, true, activeCongregationId),
    );
  }

  async findAll(
    query: QuerySmallGroupsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSmallGroupsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, q, status } = query;

    const qb = this.groupsRepository
      .createQueryBuilder('sg')
      .leftJoinAndSelect('sg.leaderMember', 'leaderMember')
      .loadRelationCountAndMap('sg.membersCount', 'sg.members')
      .where('sg.congregationId = :congregationId', { congregationId })
      .orderBy('sg.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('sg.status = :status', { status });
    }
    if (q) {
      qb.andWhere('sg.name LIKE :q', { q: `%${q}%` });
    }

    const [groups, total] = await qb.getManyAndCount();
    return {
      data: groups.map((group) =>
        SmallGroupResponseDto.fromEntity(group, {
          membersCount: (group as SmallGroup & { membersCount?: number })
            .membersCount,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async listLeaderOptions(
    query: QueryLeaderOptionsDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupLeaderOptionDto[]> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const qb = this.churchMembersRepository
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

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<SmallGroupResponseDto> {
    const group = await this.getGroupOrFail(id, true, activeCongregationId);
    const membersCount = await this.membersRepository.count({
      where: { smallGroupId: id },
    });
    return SmallGroupResponseDto.fromEntity(group, { membersCount });
  }

  async update(
    id: string,
    dto: UpdateSmallGroupDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupResponseDto> {
    const group = await this.getGroupOrFail(id, true, activeCongregationId);
    const previousLeaderId = group.leaderMemberId;

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== group.name) {
        await this.assertNameAvailable(group.congregationId, name, id);
      }
      group.name = name;
    }
    if (dto.description !== undefined) {
      group.description = this.nullableText(dto.description);
    }
    if (dto.address !== undefined) {
      group.address = this.nullableText(dto.address);
    }
    if (dto.dayOfWeek !== undefined) {
      group.dayOfWeek = dto.dayOfWeek;
    }
    if (dto.startTime !== undefined) {
      group.startTime = dto.startTime ?? null;
    }
    if (dto.status !== undefined) {
      group.status = dto.status;
    }

    if (dto.leaderMemberId !== undefined) {
      if (dto.leaderMemberId === null || dto.leaderMemberId === '') {
        group.leaderMemberId = null;
      } else {
        await this.assertLeaderEligible(
          dto.leaderMemberId,
          group.congregationId,
        );
        group.leaderMemberId = dto.leaderMemberId;
        await this.syncLeaderLink(
          group.id,
          dto.leaderMemberId,
          previousLeaderId,
        );
      }
    }

    const saved = await this.groupsRepository.save(group);
    this.logger.log(`Pequeno grupo atualizado: ${saved.id}`);
    return this.toGroupResponse(
      await this.getGroupOrFail(saved.id, true, activeCongregationId),
    );
  }

  async remove(id: string, activeCongregationId?: string): Promise<void> {
    const group = await this.getGroupOrFail(id, true, activeCongregationId);
    await this.groupsRepository.softRemove(group);
    this.logger.log(`Pequeno grupo removido (soft delete): ${id}`);
  }

  async findMembers(
    groupId: string,
    query: QuerySmallGroupMembersDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSmallGroupMembersResponseDto> {
    await this.getGroupOrFail(groupId, true, activeCongregationId);
    const { page, limit, status } = query;

    const qb = this.membersRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.member', 'member')
      .where('link.smallGroupId = :groupId', { groupId })
      .orderBy('link.joinedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('link.status = :status', { status });
    }

    const [links, total] = await qb.getManyAndCount();
    return {
      data: links.map((link) => SmallGroupMemberResponseDto.fromEntity(link)),
      total,
      page,
      limit,
    };
  }

  async addMember(
    groupId: string,
    dto: AddSmallGroupMemberDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupMemberResponseDto> {
    const group = await this.getGroupOrFail(
      groupId,
      true,
      activeCongregationId,
    );
    const member = await this.assertMemberEligible(
      dto.memberId,
      group.congregationId,
    );

    const existing = await this.membersRepository.findOne({
      where: { smallGroupId: groupId, memberId: dto.memberId },
    });
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SMALL_GROUPS_MEMBER_ALREADY_LINKED,
        message:
          ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEMBER_ALREADY_LINKED],
      });
    }

    const role = dto.role ?? SmallGroupMemberRole.MEMBER;
    const link = this.membersRepository.create({
      smallGroupId: groupId,
      memberId: dto.memberId,
      role,
      status: dto.status ?? SmallGroupMemberStatus.ACTIVE,
      joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
    });
    const saved = await this.membersRepository.save(link);

    if (role === SmallGroupMemberRole.LEADER && !group.leaderMemberId) {
      group.leaderMemberId = dto.memberId;
      await this.groupsRepository.save(group);
    }

    saved.member = member;
    this.logger.log(`Membro ${dto.memberId} vinculado ao grupo ${groupId}`);
    return SmallGroupMemberResponseDto.fromEntity(saved);
  }

  async updateMember(
    groupId: string,
    memberId: string,
    dto: UpdateSmallGroupMemberDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupMemberResponseDto> {
    const group = await this.getGroupOrFail(
      groupId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(groupId, memberId);

    if (dto.role !== undefined) {
      link.role = dto.role;
    }
    if (dto.status !== undefined) {
      link.status = dto.status;
    }

    const saved = await this.membersRepository.save(link);

    if (dto.role === SmallGroupMemberRole.LEADER && !group.leaderMemberId) {
      group.leaderMemberId = memberId;
      await this.groupsRepository.save(group);
    }

    if (!saved.member) {
      saved.member = await this.churchMembersRepository.findOneOrFail({
        where: { id: memberId },
      });
    }

    return SmallGroupMemberResponseDto.fromEntity(saved);
  }

  async removeMember(
    groupId: string,
    memberId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    const group = await this.getGroupOrFail(
      groupId,
      true,
      activeCongregationId,
    );
    const link = await this.getLinkOrFail(groupId, memberId);

    await this.membersRepository.remove(link);

    if (group.leaderMemberId === memberId) {
      group.leaderMemberId = null;
      await this.groupsRepository.save(group);
    }

    this.logger.log(`Membro ${memberId} desvinculado do grupo ${groupId}`);
  }

  async listMemberOptions(
    groupId: string,
    query: QueryMemberOptionsDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupMemberOptionDto[]> {
    const group = await this.getGroupOrFail(
      groupId,
      true,
      activeCongregationId,
    );
    const qb = this.churchMembersRepository
      .createQueryBuilder('member')
      .select(['member.id', 'member.fullName'])
      .where('member.congregationId = :congregationId', {
        congregationId: group.congregationId,
      })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM small_group_members sgm
          WHERE sgm.member_id = member.id AND sgm.small_group_id = :groupId
        )`,
        { groupId },
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

  async findMeetings(
    groupId: string,
    query: QuerySmallGroupMeetingsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSmallGroupMeetingsResponseDto> {
    await this.getGroupOrFail(groupId, true, activeCongregationId);
    const { page, limit, from, to } = query;

    const qb = this.meetingsRepository
      .createQueryBuilder('meeting')
      .where('meeting.smallGroupId = :groupId', { groupId })
      .orderBy('meeting.meetingDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (from) {
      qb.andWhere('meeting.meetingDate >= :from', { from });
    }
    if (to) {
      qb.andWhere('meeting.meetingDate <= :to', { to });
    }

    const [meetings, total] = await qb.getManyAndCount();
    return {
      data: meetings.map((meeting) =>
        SmallGroupMeetingResponseDto.fromEntity(meeting),
      ),
      total,
      page,
      limit,
    };
  }

  async createMeeting(
    groupId: string,
    dto: CreateSmallGroupMeetingDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupMeetingResponseDto> {
    const group = await this.getWritableGroupOrFail(
      groupId,
      activeCongregationId,
    );
    await this.assertMeetingDateAvailable(group.id, dto.meetingDate);

    const meeting = this.meetingsRepository.create({
      smallGroupId: group.id,
      meetingDate: dto.meetingDate,
      theme: this.nullableText(dto.theme),
      notes: this.nullableText(dto.notes),
    });
    const saved = await this.meetingsRepository.save(meeting);
    this.logger.log(
      `Reunião criada: ${saved.id} (grupo ${groupId}, ${dto.meetingDate})`,
    );
    return SmallGroupMeetingResponseDto.fromEntity(saved);
  }

  async updateMeeting(
    groupId: string,
    meetingId: string,
    dto: UpdateSmallGroupMeetingDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupMeetingResponseDto> {
    await this.getWritableGroupOrFail(groupId, activeCongregationId);
    const meeting = await this.getMeetingOrFail(groupId, meetingId);

    if (
      dto.meetingDate !== undefined &&
      dto.meetingDate !== meeting.meetingDate
    ) {
      await this.assertMeetingDateAvailable(
        groupId,
        dto.meetingDate,
        meetingId,
      );
      meeting.meetingDate = dto.meetingDate;
    }
    if (dto.theme !== undefined) {
      meeting.theme = this.nullableText(dto.theme);
    }
    if (dto.notes !== undefined) {
      meeting.notes = this.nullableText(dto.notes);
    }

    const saved = await this.meetingsRepository.save(meeting);
    return SmallGroupMeetingResponseDto.fromEntity(saved);
  }

  async removeMeeting(
    groupId: string,
    meetingId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    await this.getWritableGroupOrFail(groupId, activeCongregationId);
    const meeting = await this.getMeetingOrFail(groupId, meetingId);
    await this.meetingsRepository.remove(meeting);
    this.logger.log(`Reunião removida: ${meetingId} (grupo ${groupId})`);
  }

  async getMeetingAttendance(
    groupId: string,
    meetingId: string,
    activeCongregationId?: string,
  ): Promise<SmallGroupMeetingAttendanceDto> {
    const group = await this.getGroupOrFail(
      groupId,
      true,
      activeCongregationId,
    );
    const meeting = await this.getMeetingOrFail(groupId, meetingId);

    const links = await this.membersRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.member', 'member')
      .where('link.smallGroupId = :groupId', { groupId })
      .andWhere('link.status = :status', {
        status: SmallGroupMemberStatus.ACTIVE,
      })
      .orderBy('member.fullName', 'ASC')
      .getMany();

    const attendanceRows = await this.attendanceRepository.find({
      where: { meetingId },
    });
    const attendanceByMember = new Map(
      attendanceRows.map((row) => [row.memberId, row]),
    );

    return {
      smallGroupId: group.id,
      smallGroupName: group.name,
      meetingId: meeting.id,
      meetingDate: this.toDateString(meeting.meetingDate),
      entries: links.map((link) => {
        const attendance = attendanceByMember.get(link.memberId);
        return {
          memberId: link.memberId,
          memberFullName: link.member?.fullName ?? '',
          memberStatus: SmallGroupMemberStatus.ACTIVE as const,
          attendanceId: attendance?.id ?? null,
          present: attendance ? attendance.present : null,
          notes: attendance?.notes ?? null,
        };
      }),
    };
  }

  async upsertMeetingAttendance(
    groupId: string,
    meetingId: string,
    dto: UpsertSmallGroupAttendanceDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupMeetingAttendanceDto> {
    await this.getWritableGroupOrFail(groupId, activeCongregationId);
    await this.getMeetingOrFail(groupId, meetingId);

    const memberIds = [...new Set(dto.entries.map((entry) => entry.memberId))];
    const activeLinks = await this.membersRepository.find({
      where: {
        smallGroupId: groupId,
        memberId: In(memberIds),
        status: SmallGroupMemberStatus.ACTIVE,
      },
    });
    const activeMemberIds = new Set(activeLinks.map((link) => link.memberId));
    const notActive = memberIds.find((id) => !activeMemberIds.has(id));
    if (notActive) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE,
        message:
          ApiErrorMessage[
            ApiErrorCode.SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE
          ],
        details: [
          {
            field: 'entries',
            code: ApiErrorCode.SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE,
            message:
              ApiErrorMessage[
                ApiErrorCode.SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE
              ],
          },
        ],
      });
    }

    for (const entry of dto.entries) {
      await this.upsertAttendanceEntry(meetingId, entry);
    }

    this.logger.log(
      `Chamada salva: grupo ${groupId}, reunião ${meetingId}, ${dto.entries.length} entradas`,
    );

    return this.getMeetingAttendance(groupId, meetingId, activeCongregationId);
  }

  async getFrequencyReport(
    groupId: string,
    query: QuerySmallGroupFrequencyDto,
    activeCongregationId?: string,
  ): Promise<SmallGroupFrequencyReportDto> {
    this.validatePeriod(query.from, query.to);
    const group = await this.getGroupOrFail(
      groupId,
      true,
      activeCongregationId,
    );

    const meetings = await this.meetingsRepository
      .createQueryBuilder('meeting')
      .where('meeting.smallGroupId = :groupId', { groupId })
      .andWhere('meeting.meetingDate >= :from', { from: query.from })
      .andWhere('meeting.meetingDate <= :to', { to: query.to })
      .getMany();
    const meetingsCount = meetings.length;
    const meetingIds = meetings.map((meeting) => meeting.id);

    const attendanceRows =
      meetingIds.length === 0
        ? []
        : await this.attendanceRepository.find({
            where: { meetingId: In(meetingIds) },
          });

    const links = await this.membersRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.member', 'member')
      .where('link.smallGroupId = :groupId', { groupId })
      .andWhere('link.status = :status', {
        status: SmallGroupMemberStatus.ACTIVE,
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

    const members = links.map((link) => {
      const presentCount = presentByMember.get(link.memberId) ?? 0;
      return {
        memberId: link.memberId,
        memberFullName: link.member?.fullName ?? '',
        presentCount,
        absentCount: meetingsCount - presentCount,
        frequencyPct: this.frequencyPct(presentCount, meetingsCount),
      };
    });

    const groupAveragePct =
      members.length === 0
        ? 0
        : this.roundOneDecimal(
            members.reduce((sum, member) => sum + member.frequencyPct, 0) /
              members.length,
          );

    return {
      smallGroupId: group.id,
      smallGroupName: group.name,
      from: query.from,
      to: query.to,
      meetingsCount,
      members,
      groupAveragePct,
    };
  }

  async exportFrequencyCsv(
    groupId: string,
    query: QuerySmallGroupFrequencyDto,
    activeCongregationId?: string,
  ): Promise<string> {
    const report = await this.getFrequencyReport(
      groupId,
      query,
      activeCongregationId,
    );
    const rows = [
      [
        'Membro',
        'Presenças',
        'Faltas',
        'Frequência %',
        'Reuniões',
        'Grupo',
        'De',
        'Até',
        'Média do grupo %',
      ],
      ...report.members.map((member) => [
        member.memberFullName,
        String(member.presentCount),
        String(member.absentCount),
        String(member.frequencyPct),
        String(report.meetingsCount),
        report.smallGroupName,
        report.from,
        report.to,
        String(report.groupAveragePct),
      ]),
    ];
    return `\uFEFF${rows.map((row) => row.map(this.csvCell).join(';')).join('\r\n')}`;
  }

  private async upsertAttendanceEntry(
    meetingId: string,
    entry: UpsertSmallGroupAttendanceEntryDto,
  ): Promise<void> {
    const existing = await this.attendanceRepository.findOne({
      where: { meetingId, memberId: entry.memberId },
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
      meetingId,
      memberId: entry.memberId,
      present: entry.present,
      notes: this.nullableText(entry.notes),
    });
    await this.attendanceRepository.save(row);
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getGroupOrFail(
    id: string,
    withLeader = true,
    activeCongregationId?: string,
  ): Promise<SmallGroup> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const group = await this.groupsRepository.findOne({
      where: { id, congregationId },
      relations: withLeader ? { leaderMember: true } : undefined,
    });
    if (!group) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SMALL_GROUPS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_NOT_FOUND],
      });
    }
    return group;
  }

  private async getWritableGroupOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<SmallGroup> {
    const group = await this.getGroupOrFail(id, true, activeCongregationId);
    if (group.status !== SmallGroupStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_NOT_FOUND],
      });
    }
    return group;
  }

  private async getLinkOrFail(
    groupId: string,
    memberId: string,
  ): Promise<SmallGroupMember> {
    const link = await this.membersRepository.findOne({
      where: { smallGroupId: groupId, memberId },
      relations: { member: true },
    });
    if (!link) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SMALL_GROUPS_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEMBER_NOT_FOUND],
      });
    }
    return link;
  }

  private async getMeetingOrFail(
    groupId: string,
    meetingId: string,
  ): Promise<SmallGroupMeeting> {
    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId, smallGroupId: groupId },
    });
    if (!meeting) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SMALL_GROUPS_MEETING_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEETING_NOT_FOUND],
      });
    }
    return meeting;
  }

  private async assertNameAvailable(
    congregationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.groupsRepository.findOne({
      where: { congregationId, name },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SMALL_GROUPS_NAME_CONFLICT,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_NAME_CONFLICT],
        details: [
          {
            field: 'name',
            code: ApiErrorCode.SMALL_GROUPS_NAME_CONFLICT,
            message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_NAME_CONFLICT],
          },
        ],
      });
    }
  }

  private async assertMeetingDateAvailable(
    groupId: string,
    meetingDate: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.meetingsRepository.findOne({
      where: { smallGroupId: groupId, meetingDate },
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SMALL_GROUPS_MEETING_DATE_CONFLICT,
        message:
          ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEETING_DATE_CONFLICT],
        details: [
          {
            field: 'meetingDate',
            code: ApiErrorCode.SMALL_GROUPS_MEETING_DATE_CONFLICT,
            message:
              ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEETING_DATE_CONFLICT],
          },
        ],
      });
    }
  }

  private async assertLeaderEligible(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.churchMembersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_LEADER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_LEADER_NOT_FOUND],
        details: [
          {
            field: 'leaderMemberId',
            code: ApiErrorCode.SMALL_GROUPS_LEADER_NOT_FOUND,
            message:
              ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_LEADER_NOT_FOUND],
          },
        ],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_LEADER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_LEADER_WRONG_CONGREGATION],
        details: [
          {
            field: 'leaderMemberId',
            code: ApiErrorCode.SMALL_GROUPS_LEADER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[
                ApiErrorCode.SMALL_GROUPS_LEADER_WRONG_CONGREGATION
              ],
          },
        ],
      });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_LEADER_INACTIVE,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_LEADER_INACTIVE],
        details: [
          {
            field: 'leaderMemberId',
            code: ApiErrorCode.SMALL_GROUPS_LEADER_INACTIVE,
            message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_LEADER_INACTIVE],
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
    const member = await this.churchMembersRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SMALL_GROUPS_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEMBER_NOT_FOUND],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEMBER_WRONG_CONGREGATION],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.SMALL_GROUPS_MEMBER_WRONG_CONGREGATION,
            message:
              ApiErrorMessage[
                ApiErrorCode.SMALL_GROUPS_MEMBER_WRONG_CONGREGATION
              ],
          },
        ],
      });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_MEMBER_INACTIVE,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEMBER_INACTIVE],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.SMALL_GROUPS_MEMBER_INACTIVE,
            message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_MEMBER_INACTIVE],
          },
        ],
      });
    }
    return member;
  }

  private async syncLeaderLink(
    groupId: string,
    leaderMemberId: string,
    previousLeaderId: string | null,
  ): Promise<void> {
    if (previousLeaderId && previousLeaderId !== leaderMemberId) {
      const previous = await this.membersRepository.findOne({
        where: { smallGroupId: groupId, memberId: previousLeaderId },
      });
      if (previous && previous.role === SmallGroupMemberRole.LEADER) {
        previous.role = SmallGroupMemberRole.MEMBER;
        await this.membersRepository.save(previous);
      }
    }

    const existing = await this.membersRepository.findOne({
      where: { smallGroupId: groupId, memberId: leaderMemberId },
    });
    if (existing) {
      existing.role = SmallGroupMemberRole.LEADER;
      existing.status = SmallGroupMemberStatus.ACTIVE;
      await this.membersRepository.save(existing);
      return;
    }

    const link = this.membersRepository.create({
      smallGroupId: groupId,
      memberId: leaderMemberId,
      role: SmallGroupMemberRole.LEADER,
      status: SmallGroupMemberStatus.ACTIVE,
      joinedAt: new Date(),
    });
    await this.membersRepository.save(link);
  }

  private validatePeriod(from: string, to: string): void {
    if (from > to) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_INVALID_PERIOD,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_INVALID_PERIOD],
      });
    }
    const max = new Date(`${from}T00:00:00.000Z`);
    max.setUTCMonth(max.getUTCMonth() + 24);
    if (new Date(`${to}T00:00:00.000Z`) > max) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SMALL_GROUPS_INVALID_PERIOD,
        message: ApiErrorMessage[ApiErrorCode.SMALL_GROUPS_INVALID_PERIOD],
      });
    }
  }

  private frequencyPct(presentCount: number, meetingsCount: number): number {
    if (meetingsCount === 0) {
      return 0;
    }
    return this.roundOneDecimal((presentCount / meetingsCount) * 100);
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

  private toGroupResponse(group: SmallGroup): SmallGroupResponseDto {
    return SmallGroupResponseDto.fromEntity(group);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
