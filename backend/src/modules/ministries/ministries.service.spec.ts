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
import { MinistryMember } from './entities/ministry-member.entity';
import { Ministry } from './entities/ministry.entity';
import { MinistryMemberRole } from './enums/ministry-member-role.enum';
import { MinistryStatus } from './enums/ministry-status.enum';
import { MinistriesService } from './ministries.service';

describe('MinistriesService', () => {
  let service: MinistriesService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const ministryId = '11111111-2222-3333-4444-555555555555';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  const ministriesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const ministryMembersRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
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

  const baseMinistry = (overrides?: Partial<Ministry>): Ministry => {
    const ministry = new Ministry();
    ministry.id = ministryId;
    ministry.congregationId = baseCongregationId;
    ministry.name = 'Louvor';
    ministry.description = 'Equipe de louvor';
    ministry.leaderMemberId = null;
    ministry.leaderMember = null;
    ministry.status = MinistryStatus.ACTIVE;
    ministry.createdAt = new Date('2026-07-18T00:00:00Z');
    ministry.updatedAt = new Date('2026-07-18T00:00:00Z');
    ministry.deletedAt = null;
    Object.assign(ministry, overrides);
    return ministry;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinistriesService,
        {
          provide: getRepositoryToken(Ministry),
          useValue: ministriesRepository,
        },
        {
          provide: getRepositoryToken(MinistryMember),
          useValue: ministryMembersRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: CongregationsService, useValue: congregationsService },
      ],
    }).compile();

    service = module.get(MinistriesService);
  });

  describe('create', () => {
    it('deve criar ministério associado à congregação-base', async () => {
      ministriesRepository.findOne.mockResolvedValue(null);
      const saved = baseMinistry();
      ministriesRepository.create.mockReturnValue(saved);
      ministriesRepository.save.mockResolvedValue(saved);
      ministriesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);

      const result = await service.create({ name: 'Louvor' });

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
      expect(ministriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Louvor',
          congregationId: baseCongregationId,
          status: MinistryStatus.ACTIVE,
        }),
      );
      expect(result.name).toBe('Louvor');
      expect(result.congregationId).toBe(baseCongregationId);
    });

    it('deve lançar 409 NAME_IN_USE para nome duplicado', async () => {
      ministriesRepository.findOne.mockResolvedValue(baseMinistry());

      try {
        await service.create({ name: 'Louvor' });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MINISTRIES_NAME_IN_USE,
        });
      }
      expect(ministriesRepository.save).not.toHaveBeenCalled();
    });

    it('deve sync líder titular com role=leader em ministry_members', async () => {
      const leader = baseMember();
      const saved = baseMinistry({ leaderMemberId: memberId });
      ministriesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);
      membersRepository.findOne.mockResolvedValue(leader);
      ministriesRepository.create.mockReturnValue(saved);
      ministriesRepository.save.mockResolvedValue(saved);
      ministryMembersRepository.findOne.mockResolvedValue(null);
      const link = {
        ministryId,
        memberId,
        role: MinistryMemberRole.LEADER,
        joinedAt: new Date(),
      };
      ministryMembersRepository.create.mockReturnValue(link);
      ministryMembersRepository.save.mockResolvedValue(link);

      await service.create({ name: 'Louvor', leaderMemberId: memberId });

      expect(ministryMembersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ministryId,
          memberId,
          role: MinistryMemberRole.LEADER,
        }),
      );
    });
  });

  describe('remove', () => {
    it('deve soft delete e findOne posterior falha com 404', async () => {
      const ministry = baseMinistry();
      ministriesRepository.findOne
        .mockResolvedValueOnce(ministry)
        .mockResolvedValueOnce(null);
      ministriesRepository.softRemove.mockResolvedValue(ministry);

      await service.remove(ministryId);

      expect(ministriesRepository.softRemove).toHaveBeenCalledWith(ministry);
      try {
        await service.findOne(ministryId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MINISTRIES_NOT_FOUND,
        });
      }
    });
  });

  describe('addMember / removeMember', () => {
    it('deve vincular membro e listar via findMembers', async () => {
      const ministry = baseMinistry();
      const member = baseMember();
      ministriesRepository.findOne.mockResolvedValue(ministry);
      membersRepository.findOne.mockResolvedValue(member);
      ministryMembersRepository.findOne.mockResolvedValue(null);
      const link = Object.assign(new MinistryMember(), {
        ministryId,
        memberId,
        role: MinistryMemberRole.MEMBER,
        joinedAt: new Date('2026-07-18T12:00:00Z'),
        member,
      });
      ministryMembersRepository.create.mockReturnValue(link);
      ministryMembersRepository.save.mockResolvedValue(link);
      ministryMembersRepository.findAndCount.mockResolvedValue([[link], 1]);

      const created = await service.addMember(ministryId, { memberId });
      expect(created.memberId).toBe(memberId);
      expect(created.memberFullName).toBe('Maria da Silva');

      const listed = await service.findMembers(ministryId, {
        page: 1,
        limit: 20,
      });
      expect(listed.total).toBe(1);
      expect(listed.data[0].memberId).toBe(memberId);
    });

    it('deve lançar 409 MEMBER_ALREADY_LINKED ao vincular duplicado', async () => {
      ministriesRepository.findOne.mockResolvedValue(baseMinistry());
      membersRepository.findOne.mockResolvedValue(baseMember());
      ministryMembersRepository.findOne.mockResolvedValue(
        Object.assign(new MinistryMember(), { ministryId, memberId }),
      );

      try {
        await service.addMember(ministryId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MINISTRIES_MEMBER_ALREADY_LINKED,
        });
      }
    });

    it('deve desvincular e zerar leader_member_id do titular', async () => {
      const ministry = baseMinistry({ leaderMemberId: memberId });
      const link = Object.assign(new MinistryMember(), {
        ministryId,
        memberId,
        role: MinistryMemberRole.LEADER,
      });
      ministriesRepository.findOne.mockResolvedValue(ministry);
      ministryMembersRepository.findOne.mockResolvedValue(link);
      ministryMembersRepository.remove.mockResolvedValue(link);
      ministriesRepository.save.mockResolvedValue({
        ...ministry,
        leaderMemberId: null,
      });

      await service.removeMember(ministryId, memberId);

      expect(ministryMembersRepository.remove).toHaveBeenCalledWith(link);
      expect(ministriesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ leaderMemberId: null }),
      );
    });
  });

  describe('findAll com memberId / findByMemberId', () => {
    it('deve filtrar ministérios pelo memberId', async () => {
      const ministry = baseMinistry();
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[ministry], 1]),
      };
      ministriesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        memberId,
      });

      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        'ministry.members',
        'memberFilter',
        'memberFilter.memberId = :memberId',
        { memberId },
      );
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe(ministryId);
    });

    it('deve retornar ministérios do membro via findByMemberId', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      const ministry = baseMinistry();
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([ministry]),
      };
      ministriesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findByMemberId(memberId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Louvor');
    });

    it('deve lançar MEMBERS.NOT_FOUND quando membro não existe', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.findByMemberId(memberId)).rejects.toBeInstanceOf(
        ApiException,
      );
    });
  });

  describe('contexto de congregação ativa', () => {
    it('findByMemberId com activeCongregationId não chama getOrCreateBase', async () => {
      const explicitId = '22222222-3333-4444-5555-666666666666';
      membersRepository.findOne.mockResolvedValue(baseMember());
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      ministriesRepository.createQueryBuilder.mockReturnValue(qb);
      jest.clearAllMocks();
      congregationsService.getOrCreateBase.mockResolvedValue(
        baseCongregation(),
      );

      await service.findByMemberId(memberId, explicitId);

      expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: memberId, congregationId: explicitId },
      });
    });
  });
});
