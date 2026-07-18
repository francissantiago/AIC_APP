import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { SmallGroupAttendance } from './entities/small-group-attendance.entity';
import { SmallGroupMeeting } from './entities/small-group-meeting.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupMemberRole } from './enums/small-group-member-role.enum';
import { SmallGroupMemberStatus } from './enums/small-group-member-status.enum';
import { SmallGroupStatus } from './enums/small-group-status.enum';
import { SmallGroupsService } from './small-groups.service';

describe('SmallGroupsService', () => {
  let service: SmallGroupsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const groupId = '11111111-2222-3333-4444-555555555555';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const otherMemberId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const otherCongregationId = 'cccccccc-dddd-eeee-ffff-000000000099';
  const meetingId = 'eeeeeeee-ffff-aaaa-bbbb-cccccccccccc';
  const attendanceId = 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb';

  const groupsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const meetingsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const attendanceRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const churchMembersRepository = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = baseCongregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseMember = (overrides?: Partial<Member>): Member => {
    const member = new Member();
    member.id = memberId;
    member.fullName = 'Maria da Silva';
    member.status = MemberStatus.ACTIVE;
    member.congregationId = baseCongregationId;
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  const baseGroup = (overrides?: Partial<SmallGroup>): SmallGroup => {
    const group = new SmallGroup();
    group.id = groupId;
    group.congregationId = baseCongregationId;
    group.name = 'Célula Centro';
    group.description = 'Grupo de comunhão';
    group.leaderMemberId = null;
    group.leaderMember = null;
    group.address = 'Rua A, 1';
    group.dayOfWeek = 3;
    group.startTime = '19:30:00';
    group.status = SmallGroupStatus.ACTIVE;
    group.createdAt = new Date('2026-07-18T00:00:00Z');
    group.updatedAt = new Date('2026-07-18T00:00:00Z');
    group.deletedAt = null;
    Object.assign(group, overrides);
    return group;
  };

  const baseLink = (
    overrides?: Partial<SmallGroupMember>,
  ): SmallGroupMember => {
    const link = new SmallGroupMember();
    link.smallGroupId = groupId;
    link.memberId = memberId;
    link.role = SmallGroupMemberRole.MEMBER;
    link.status = SmallGroupMemberStatus.ACTIVE;
    link.joinedAt = new Date('2026-07-18T12:00:00Z');
    link.member = baseMember();
    Object.assign(link, overrides);
    return link;
  };

  const baseMeeting = (
    overrides?: Partial<SmallGroupMeeting>,
  ): SmallGroupMeeting => {
    const meeting = new SmallGroupMeeting();
    meeting.id = meetingId;
    meeting.smallGroupId = groupId;
    meeting.meetingDate = '2026-07-18';
    meeting.theme = 'Discipulado';
    meeting.notes = null;
    meeting.createdAt = new Date('2026-07-18T00:00:00Z');
    meeting.updatedAt = new Date('2026-07-18T00:00:00Z');
    Object.assign(meeting, overrides);
    return meeting;
  };

  const baseAttendance = (
    overrides?: Partial<SmallGroupAttendance>,
  ): SmallGroupAttendance => {
    const row = new SmallGroupAttendance();
    row.id = attendanceId;
    row.meetingId = meetingId;
    row.memberId = memberId;
    row.present = true;
    row.notes = null;
    row.createdAt = new Date('2026-07-18T12:00:00Z');
    row.updatedAt = new Date('2026-07-18T12:00:00Z');
    Object.assign(row, overrides);
    return row;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    membersRepository.count.mockResolvedValue(0);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmallGroupsService,
        {
          provide: getRepositoryToken(SmallGroup),
          useValue: groupsRepository,
        },
        {
          provide: getRepositoryToken(SmallGroupMember),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(SmallGroupMeeting),
          useValue: meetingsRepository,
        },
        {
          provide: getRepositoryToken(SmallGroupAttendance),
          useValue: attendanceRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: churchMembersRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
      ],
    }).compile();

    service = module.get(SmallGroupsService);
  });

  describe('create / list / update / soft-delete', () => {
    it('deve criar grupo associado à congregação-base', async () => {
      groupsRepository.findOne.mockResolvedValue(null);
      const saved = baseGroup();
      groupsRepository.create.mockReturnValue(saved);
      groupsRepository.save.mockResolvedValue(saved);
      groupsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);

      const result = await service.create({ name: 'Célula Centro' });

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
      expect(groupsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Célula Centro',
          congregationId: baseCongregationId,
          status: SmallGroupStatus.ACTIVE,
        }),
      );
      expect(result.name).toBe('Célula Centro');
    });

    it('deve lançar 409 NAME_CONFLICT para nome duplicado', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());

      try {
        await service.create({ name: 'Célula Centro' });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_NAME_CONFLICT,
        });
      }
      expect(groupsRepository.save).not.toHaveBeenCalled();
    });

    it('deve listar com paginação e filtro', async () => {
      const group = baseGroup();
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[group], 1]),
      };
      groupsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        q: 'Célula',
        status: SmallGroupStatus.ACTIVE,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('sg.status = :status', {
        status: SmallGroupStatus.ACTIVE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('sg.name LIKE :q', {
        q: '%Célula%',
      });
      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('Célula Centro');
    });

    it('deve atualizar campos do grupo', async () => {
      const group = baseGroup();
      groupsRepository.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...group,
          name: 'Célula Norte',
          leaderMember: null,
        });
      groupsRepository.save.mockResolvedValue({
        ...group,
        name: 'Célula Norte',
      });

      const result = await service.update(groupId, { name: 'Célula Norte' });

      expect(groupsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Célula Norte' }),
      );
      expect(result.name).toBe('Célula Norte');
    });

    it('deve soft delete e findOne posterior falha com 404', async () => {
      const group = baseGroup();
      groupsRepository.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(null);
      groupsRepository.softRemove.mockResolvedValue(group);

      await service.remove(groupId);

      expect(groupsRepository.softRemove).toHaveBeenCalledWith(group);
      try {
        await service.findOne(groupId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_NOT_FOUND,
        });
      }
    });
  });

  describe('members + leader sync', () => {
    it('deve sync líder com role=leader e status=active', async () => {
      const leader = baseMember();
      const saved = baseGroup({ leaderMemberId: memberId });
      groupsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);
      churchMembersRepository.findOne.mockResolvedValue(leader);
      groupsRepository.create.mockReturnValue(saved);
      groupsRepository.save.mockResolvedValue(saved);
      membersRepository.findOne.mockResolvedValue(null);
      const link = baseLink({ role: SmallGroupMemberRole.LEADER });
      membersRepository.create.mockReturnValue(link);
      membersRepository.save.mockResolvedValue(link);

      await service.create({ name: 'Célula Centro', leaderMemberId: memberId });

      expect(membersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          smallGroupId: groupId,
          memberId,
          role: SmallGroupMemberRole.LEADER,
          status: SmallGroupMemberStatus.ACTIVE,
        }),
      );
    });

    it('deve rebaixar líder anterior para member ao trocar líder', async () => {
      const previousLeaderId = otherMemberId;
      const group = baseGroup({ leaderMemberId: previousLeaderId });
      const newLeader = baseMember();
      const previousLink = baseLink({
        memberId: previousLeaderId,
        role: SmallGroupMemberRole.LEADER,
      });
      const newLink = baseLink({ role: SmallGroupMemberRole.LEADER });

      groupsRepository.findOne
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce({
          ...group,
          leaderMemberId: memberId,
          leaderMember: newLeader,
        });
      churchMembersRepository.findOne.mockResolvedValue(newLeader);
      membersRepository.findOne
        .mockResolvedValueOnce(previousLink)
        .mockResolvedValueOnce(null);
      membersRepository.create.mockReturnValue(newLink);
      membersRepository.save.mockResolvedValue(newLink);
      groupsRepository.save.mockResolvedValue({
        ...group,
        leaderMemberId: memberId,
      });

      await service.update(groupId, { leaderMemberId: memberId });

      expect(membersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: previousLeaderId,
          role: SmallGroupMemberRole.MEMBER,
        }),
      );
      expect(membersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId,
          role: SmallGroupMemberRole.LEADER,
        }),
      );
    });

    it('deve adicionar membro e rejeitar duplicado', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      churchMembersRepository.findOne.mockResolvedValue(baseMember());
      membersRepository.findOne.mockResolvedValue(null);
      const link = baseLink();
      membersRepository.create.mockReturnValue(link);
      membersRepository.save.mockResolvedValue(link);

      const result = await service.addMember(groupId, { memberId });
      expect(result.memberId).toBe(memberId);

      membersRepository.findOne.mockResolvedValue(baseLink());
      try {
        await service.addMember(groupId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_MEMBER_ALREADY_LINKED,
        });
      }
    });

    it('deve rejeitar membro de outra congregação', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      churchMembersRepository.findOne.mockResolvedValue(
        baseMember({ congregationId: otherCongregationId }),
      );

      try {
        await service.addMember(groupId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_MEMBER_WRONG_CONGREGATION,
        });
      }
    });

    it('deve atualizar role/status e remover vínculo', async () => {
      const link = baseLink();
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      membersRepository.findOne.mockResolvedValue(link);
      membersRepository.save.mockResolvedValue({
        ...link,
        role: SmallGroupMemberRole.ASSISTANT,
        status: SmallGroupMemberStatus.INACTIVE,
      });

      const updated = await service.updateMember(groupId, memberId, {
        role: SmallGroupMemberRole.ASSISTANT,
        status: SmallGroupMemberStatus.INACTIVE,
      });
      expect(updated.role).toBe(SmallGroupMemberRole.ASSISTANT);
      expect(updated.status).toBe(SmallGroupMemberStatus.INACTIVE);

      membersRepository.findOne.mockResolvedValue(link);
      membersRepository.remove.mockResolvedValue(link);
      await service.removeMember(groupId, memberId);
      expect(membersRepository.remove).toHaveBeenCalledWith(link);
    });
  });

  describe('meetings', () => {
    it('deve criar reunião e rejeitar data duplicada', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      meetingsRepository.findOne.mockResolvedValue(null);
      const meeting = baseMeeting();
      meetingsRepository.create.mockReturnValue(meeting);
      meetingsRepository.save.mockResolvedValue(meeting);

      const created = await service.createMeeting(groupId, {
        meetingDate: '2026-07-18',
        theme: 'Discipulado',
      });
      expect(created.meetingDate).toBe('2026-07-18');

      meetingsRepository.findOne.mockResolvedValue(baseMeeting());
      try {
        await service.createMeeting(groupId, { meetingDate: '2026-07-18' });
        fail('esperava ApiException');
      } catch (error) {
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_MEETING_DATE_CONFLICT,
        });
      }
    });

    it('deve atualizar e excluir reunião', async () => {
      const meeting = baseMeeting();
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      meetingsRepository.findOne.mockResolvedValue(meeting);
      meetingsRepository.save.mockResolvedValue({
        ...meeting,
        theme: 'Oração',
      });

      const updated = await service.updateMeeting(groupId, meetingId, {
        theme: 'Oração',
      });
      expect(updated.theme).toBe('Oração');

      meetingsRepository.remove.mockResolvedValue(meeting);
      await service.removeMeeting(groupId, meetingId);
      expect(meetingsRepository.remove).toHaveBeenCalledWith(meeting);
    });

    it('não permite criar reunião em grupo inactive', async () => {
      groupsRepository.findOne.mockResolvedValue(
        baseGroup({ status: SmallGroupStatus.INACTIVE }),
      );

      try {
        await service.createMeeting(groupId, { meetingDate: '2026-07-18' });
        fail('esperava ApiException');
      } catch (error) {
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_NOT_FOUND,
        });
      }
    });
  });

  describe('attendance', () => {
    it('GET folha mescla membros active com attendance da reunião', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      meetingsRepository.findOne.mockResolvedValue(baseMeeting());
      const withRow = baseLink();
      const withoutRow = baseLink({
        memberId: otherMemberId,
        member: baseMember({
          id: otherMemberId,
          fullName: 'João Pereira',
        }),
      });
      const linkQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([withRow, withoutRow]),
      };
      membersRepository.createQueryBuilder.mockReturnValue(linkQb);
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({ notes: 'Chegou atrasado' }),
      ]);

      const sheet = await service.getMeetingAttendance(groupId, meetingId);

      expect(sheet.meetingId).toBe(meetingId);
      expect(sheet.entries).toHaveLength(2);
      expect(sheet.entries[0]).toMatchObject({
        memberId,
        attendanceId,
        present: true,
        notes: 'Chegou atrasado',
      });
      expect(sheet.entries[1]).toMatchObject({
        memberId: otherMemberId,
        attendanceId: null,
        present: null,
      });
    });

    it('PUT upsert cria e atualiza presença', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      meetingsRepository.findOne.mockResolvedValue(baseMeeting());
      membersRepository.find.mockResolvedValue([baseLink()]);
      attendanceRepository.findOne.mockResolvedValueOnce(null);
      const created = baseAttendance({ present: true });
      attendanceRepository.create.mockReturnValue(created);
      attendanceRepository.save.mockResolvedValueOnce(created);

      const linkQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseLink()]),
      };
      membersRepository.createQueryBuilder.mockReturnValue(linkQb);
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({ present: true }),
      ]);

      await service.upsertMeetingAttendance(groupId, meetingId, {
        entries: [{ memberId, present: true }],
      });
      expect(attendanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingId,
          memberId,
          present: true,
        }),
      );

      attendanceRepository.findOne.mockResolvedValue(
        baseAttendance({ present: true }),
      );
      attendanceRepository.save.mockResolvedValue(
        baseAttendance({ present: false, notes: 'Falta' }),
      );
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({ present: false, notes: 'Falta' }),
      ]);

      const updated = await service.upsertMeetingAttendance(
        groupId,
        meetingId,
        {
          entries: [{ memberId, present: false, notes: 'Falta' }],
        },
      );
      expect(attendanceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          present: false,
          notes: 'Falta',
        }),
      );
      expect(updated.entries[0].present).toBe(false);
    });

    it('PUT rejeita membro sem vínculo active', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      meetingsRepository.findOne.mockResolvedValue(baseMeeting());
      membersRepository.find.mockResolvedValue([]);

      try {
        await service.upsertMeetingAttendance(groupId, meetingId, {
          entries: [{ memberId, present: true }],
        });
        fail('esperava ApiException');
      } catch (error) {
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE,
        });
      }
      expect(attendanceRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('frequency', () => {
    it('relatório % correto com 2 reuniões e 1 falta', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      const meetingA = baseMeeting({
        id: 'aaaaaaaa-1111-2222-3333-444444444444',
        meetingDate: '2026-07-06',
      });
      const meetingB = baseMeeting({
        id: 'bbbbbbbb-1111-2222-3333-444444444444',
        meetingDate: '2026-07-13',
      });
      const meetingsQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([meetingA, meetingB]),
      };
      meetingsRepository.createQueryBuilder.mockReturnValue(meetingsQb);
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({
          meetingId: meetingA.id,
          present: true,
        }),
        baseAttendance({
          meetingId: meetingB.id,
          present: false,
        }),
      ]);
      const linkQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseLink()]),
      };
      membersRepository.createQueryBuilder.mockReturnValue(linkQb);

      const report = await service.getFrequencyReport(groupId, {
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(report.meetingsCount).toBe(2);
      expect(report.members[0]).toMatchObject({
        memberId,
        presentCount: 1,
        absentCount: 1,
        frequencyPct: 50,
      });
      expect(report.groupAveragePct).toBe(50);
    });

    it('período > 24 meses lança 422 INVALID_PERIOD', async () => {
      try {
        await service.getFrequencyReport(groupId, {
          from: '2024-01-01',
          to: '2026-02-01',
        });
        fail('esperava ApiException');
      } catch (error) {
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.SMALL_GROUPS_INVALID_PERIOD,
        });
      }
      expect(groupsRepository.findOne).not.toHaveBeenCalled();
    });

    it('CSV retorna BOM e header', async () => {
      groupsRepository.findOne.mockResolvedValue(baseGroup());
      const meetingsQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseMeeting()]),
      };
      meetingsRepository.createQueryBuilder.mockReturnValue(meetingsQb);
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({ present: true }),
      ]);
      const linkQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseLink()]),
      };
      membersRepository.createQueryBuilder.mockReturnValue(linkQb);

      const csv = await service.exportFrequencyCsv(groupId, {
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain(
        '"Membro";"Presenças";"Faltas";"Frequência %";"Reuniões";"Grupo";"De";"Até";"Média do grupo %"',
      );
      expect(csv).toContain('Maria da Silva');
      expect(csv).toContain(';');
    });
  });
});
