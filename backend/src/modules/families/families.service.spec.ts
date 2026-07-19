import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { FamilyMember } from './entities/family-member.entity';
import { Family } from './entities/family.entity';
import { FamilyRelation } from './enums/family-relation.enum';
import { FamiliesService } from './families.service';

describe('FamiliesService', () => {
  let service: FamiliesService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const familyId = '11111111-2222-3333-4444-555555555555';
  const otherFamilyId = '22222222-3333-4444-5555-666666666666';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const familiesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const familyMembersRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
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
    member.birthDate = '1990-07-12';
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  const baseFamily = (overrides?: Partial<Family>): Family => {
    const family = new Family();
    family.id = familyId;
    family.congregationId = baseCongregationId;
    family.name = 'Família Silva';
    family.notes = null;
    family.headMemberId = null;
    family.headMember = null;
    family.createdAt = new Date('2026-07-18T00:00:00Z');
    family.updatedAt = new Date('2026-07-18T00:00:00Z');
    family.deletedAt = null;
    Object.assign(family, overrides);
    return family;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    dataSource.transaction.mockImplementation(
      (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          save: jest.fn().mockImplementation((entity: unknown) => entity),
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
          softRemove: jest.fn().mockImplementation((entity: unknown) => entity),
        };
        return cb(manager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamiliesService,
        {
          provide: getRepositoryToken(Family),
          useValue: familiesRepository,
        },
        {
          provide: getRepositoryToken(FamilyMember),
          useValue: familyMembersRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(FamiliesService);
  });

  describe('create', () => {
    it('deve criar família e auto-vincular head com relation=other', async () => {
      const head = baseMember();
      const saved = baseFamily({ headMemberId: memberId });
      membersRepository.findOne.mockResolvedValue(head);
      familiesRepository.create.mockReturnValue(saved);
      familiesRepository.save.mockResolvedValue(saved);
      familyMembersRepository.findOne.mockResolvedValue(null);
      const link = Object.assign(new FamilyMember(), {
        familyId,
        memberId,
        relation: FamilyRelation.OTHER,
        joinedAt: new Date(),
      });
      familyMembersRepository.create.mockReturnValue(link);
      familyMembersRepository.save.mockResolvedValue(link);
      familiesRepository.findOne.mockResolvedValue({
        ...saved,
        headMember: head,
      });

      const result = await service.create({
        name: 'Família Silva',
        headMemberId: memberId,
      });

      expect(familyMembersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId,
          memberId,
          relation: FamilyRelation.OTHER,
        }),
      );
      expect(result.headMemberId).toBe(memberId);
      expect(result.name).toBe('Família Silva');
    });
  });

  describe('addMember', () => {
    it('deve lançar 409 MEMBER_ALREADY_IN_FAMILY ao vincular em segunda família', async () => {
      familiesRepository.findOne.mockResolvedValue(baseFamily());
      membersRepository.findOne.mockResolvedValue(baseMember());
      familyMembersRepository.findOne.mockResolvedValue(
        Object.assign(new FamilyMember(), {
          familyId: otherFamilyId,
          memberId,
        }),
      );

      try {
        await service.addMember(familyId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY,
        });
      }
    });
  });

  describe('remove', () => {
    it('deve soft delete, limpar vínculos e zerar head', async () => {
      const family = baseFamily({ headMemberId: memberId });
      familiesRepository.findOne.mockResolvedValue(family);
      const manager = {
        save: jest.fn().mockResolvedValue(family),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        softRemove: jest.fn().mockResolvedValue(family),
      };
      dataSource.transaction.mockImplementationOnce(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      );

      await service.remove(familyId);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ headMemberId: null }),
      );
      expect(manager.delete).toHaveBeenCalledWith(FamilyMember, {
        familyId,
      });
      expect(manager.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: familyId }),
      );
    });
  });

  describe('removeMember', () => {
    it('deve desvincular head e zerar head_member_id', async () => {
      const family = baseFamily({ headMemberId: memberId });
      const link = Object.assign(new FamilyMember(), {
        familyId,
        memberId,
        relation: FamilyRelation.OTHER,
      });
      familiesRepository.findOne.mockResolvedValue(family);
      familyMembersRepository.findOne.mockResolvedValue(link);
      familyMembersRepository.remove.mockResolvedValue(link);
      familiesRepository.save.mockResolvedValue({
        ...family,
        headMemberId: null,
      });

      await service.removeMember(familyId, memberId);

      expect(familyMembersRepository.remove).toHaveBeenCalledWith(link);
      expect(familiesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ headMemberId: null }),
      );
    });
  });

  describe('findBirthdays', () => {
    it('deve filtrar aniversariantes do mês informado', async () => {
      const member = baseMember({ birthDate: '1990-07-12' });
      const family = baseFamily();
      const link = Object.assign(new FamilyMember(), {
        familyId,
        memberId,
        relation: FamilyRelation.SPOUSE,
        member,
        family,
      });
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([link]),
      };
      familyMembersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findBirthdays({ month: 7 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'MONTH(member.birthDate) = :month',
        { month: 7 },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].day).toBe(12);
      expect(result.data[0].familyName).toBe('Família Silva');
    });
  });

  describe('findByMemberId', () => {
    it('deve lançar 404 MEMBER_FAMILY_NOT_FOUND sem vínculo', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      familyMembersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      try {
        await service.findByMemberId(memberId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.FAMILIES_MEMBER_FAMILY_NOT_FOUND,
        });
      }
    });

    it('deve retornar família do membro quando vinculado', async () => {
      const member = baseMember();
      const family = baseFamily({ headMember: member, headMemberId: memberId });
      membersRepository.findOne.mockResolvedValue(member);
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(
          Object.assign(new FamilyMember(), {
            familyId,
            memberId,
            family,
          }),
        ),
      };
      familyMembersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      familyMembersRepository.count.mockResolvedValue(2);

      const result = await service.findByMemberId(memberId);

      expect(result.id).toBe(familyId);
      expect(result.membersCount).toBe(2);
    });
  });

  describe('contexto de congregação ativa', () => {
    it('findBirthdays com activeCongregationId não chama getOrCreateBase', async () => {
      const explicitId = '22222222-3333-4444-5555-666666666666';
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      familyMembersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      jest.clearAllMocks();
      congregationsService.getOrCreateBase.mockResolvedValue(
        baseCongregation(),
      );

      await service.findBirthdays({ month: 7 }, explicitId);

      expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'family.congregationId = :congregationId',
        { congregationId: explicitId },
      );
    });
  });
});
