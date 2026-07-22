import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { FamiliesService } from '../families/families.service';
import { FileStorageService } from '../secretariat/storage/file-storage.service';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './entities/member.entity';
import { MemberGender } from './enums/member-gender.enum';
import { MemberMaritalStatus } from './enums/member-marital-status.enum';
import { MemberStatus } from './enums/member-status.enum';
import { MembersService } from './members.service';
import { MemberBirthdayCalendarSyncService } from './member-birthday-calendar.sync.service';

describe('MembersService', () => {
  let service: MembersService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const fatherId = '11111111-2222-3333-4444-555555555501';
  const motherId = '11111111-2222-3333-4444-555555555502';

  const managerCreate = jest.fn();
  const managerSave = jest.fn();
  const managerQuery = jest.fn();
  type MockEntityManager = {
    create: jest.Mock;
    save: jest.Mock;
    query: jest.Mock;
    transaction: jest.Mock;
  };
  const manager: MockEntityManager = {
    create: managerCreate,
    save: managerSave,
    query: managerQuery,
    transaction: jest.fn((cb: (m: MockEntityManager) => Promise<unknown>) =>
      cb(manager),
    ),
  };
  const membersFindOne = jest.fn();
  const membersFind = jest.fn();
  const membersSave = jest.fn();
  const membersSoftRemove = jest.fn();
  const membersCreateQueryBuilder = jest.fn();
  const membersRepository = {
    findOne: membersFindOne,
    find: membersFind,
    create: jest.fn(),
    save: membersSave,
    softRemove: membersSoftRemove,
    createQueryBuilder: membersCreateQueryBuilder,
    manager,
  };
  const usersFindOne = jest.fn();
  const usersRepository = {
    findOne: usersFindOne,
  };
  const getOrCreateBase = jest.fn();
  const congregationsService = {
    getOrCreateBase,
  };
  const birthdayCalendarSync = {
    syncOnCreate: jest.fn(),
    syncOnUpdate: jest.fn(),
    syncOnRemove: jest.fn(),
  };
  const fileStorageService = {
    saveImageAsset: jest.fn(),
    deleteIfExists: jest.fn(),
    openReadStream: jest.fn(),
  };
  const linkFiliationFamily = jest.fn();
  const familiesService = {
    linkFiliationFamily,
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
    member.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    member.fullName = 'Maria da Silva';
    member.email = 'maria.silva@igreja.org';
    member.phone = '+5511999999999';
    member.document = '12345678900';
    member.birthDate = '1990-05-20';
    member.gender = MemberGender.FEMALE;
    member.maritalStatus = MemberMaritalStatus.MARRIED;
    member.status = MemberStatus.ACTIVE;
    member.baptismDate = '2010-08-15';
    member.membershipDate = '2012-01-10';
    member.address = 'Rua das Flores, 100';
    member.city = 'São Paulo';
    member.state = 'SP';
    member.zipCode = '01310-100';
    member.notes = null;
    member.rg = null;
    member.registrationNumber = null;
    member.placeOfBirth = null;
    member.bloodType = null;
    member.fatherName = null;
    member.motherName = null;
    member.fatherMemberId = null;
    member.motherMemberId = null;
    member.positionTitle = null;
    member.photoPath = null;
    member.congregationId = baseCongregationId;
    member.userId = null;
    member.user = null;
    member.createdAt = new Date('2026-07-17T00:00:00Z');
    member.updatedAt = new Date('2026-07-17T00:00:00Z');
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  const createDto = (): CreateMemberDto => ({
    fullName: 'Maria da Silva',
    email: 'maria.silva@igreja.org',
    phone: '+5511999999999',
    document: '12345678900',
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    getOrCreateBase.mockResolvedValue(baseCongregation());
    membersFind.mockResolvedValue([]);
    linkFiliationFamily.mockResolvedValue({
      attempted: true,
      linked: true,
      familyId: 'ffffffff-1111-2222-3333-444444444444',
      familyName: 'Família Silva',
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: CongregationsService, useValue: congregationsService },
        {
          provide: MemberBirthdayCalendarSyncService,
          useValue: birthdayCalendarSync,
        },
        { provide: FileStorageService, useValue: fileStorageService },
        { provide: FamiliesService, useValue: familiesService },
      ],
    }).compile();

    service = module.get(MembersService);
  });

  describe('create', () => {
    it('deve criar membro associado à congregação-base', async () => {
      membersFindOne.mockResolvedValue(null);
      const saved = baseMember();
      saved.registrationNumber = '000001';
      managerCreate.mockReturnValue(saved);
      managerSave.mockResolvedValue(saved);
      managerQuery
        .mockResolvedValueOnce([{ id: baseCongregationId }])
        .mockResolvedValueOnce([{ max_seq: 0 }]);

      const result = await service.create(createDto());

      expect(getOrCreateBase).toHaveBeenCalled();
      expect(managerCreate).toHaveBeenCalledWith(
        Member,
        expect.objectContaining({
          fullName: 'Maria da Silva',
          gender: MemberGender.UNSPECIFIED,
          maritalStatus: MemberMaritalStatus.OTHER,
          status: MemberStatus.ACTIVE,
          congregationId: baseCongregationId,
          registrationNumber: '000001',
        }),
      );
      expect(result.fullName).toBe('Maria da Silva');
      expect(result.congregationId).toBe(baseCongregationId);
      expect(result.registrationNumber).toBe('000001');
      expect(result).not.toHaveProperty('user');
    });

    it('deve lançar 422 quando userId aponta para usuário inexistente', async () => {
      membersFindOne.mockResolvedValue(null);
      usersFindOne.mockResolvedValue(null);

      await expect(
        service.create({
          ...createDto(),
          userId: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
        }),
      ).rejects.toThrow(ApiException);
      expect(managerSave).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve listar apenas membros da congregação-base', async () => {
      const member = baseMember();
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[member], 1]),
      };
      membersCreateQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        status: MemberStatus.ACTIVE,
        q: 'silva',
      });

      expect(getOrCreateBase).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'member.congregationId = :congregationId',
        { congregationId: baseCongregationId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(1);
      expect(result.data[0].fullName).toBe('Maria da Silva');
      expect(result.data[0].congregationId).toBe(baseCongregationId);
    });
  });

  describe('update', () => {
    it('deve lançar 409 quando o novo email pertence a outro membro', async () => {
      const member = baseMember();
      const other = baseMember();
      other.id = '11111111-2222-3333-4444-555555555555';
      membersFindOne.mockResolvedValueOnce(member).mockResolvedValueOnce(other);

      await expect(
        service.update(member.id, { email: 'outro@igreja.org' }),
      ).rejects.toThrow(ApiException);
    });

    it('deve lançar 404 quando o membro está fora do escopo da base', async () => {
      membersFindOne.mockResolvedValue(null);

      await expect(
        service.update('id-fora-do-escopo', { fullName: 'Outro' }),
      ).rejects.toThrow(ApiException);
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete via softRemove', async () => {
      const member = baseMember();
      membersFindOne.mockResolvedValue(member);
      membersSoftRemove.mockResolvedValue(member);

      await service.remove(member.id);

      expect(membersFindOne).toHaveBeenCalledWith({
        where: { id: member.id, congregationId: baseCongregationId },
      });
      expect(membersSoftRemove).toHaveBeenCalledWith(member);
    });

    it('deve lançar 404 quando o membro não existe', async () => {
      membersFindOne.mockResolvedValue(null);

      await expect(service.remove('id-inexistente')).rejects.toThrow(
        ApiException,
      );
      expect(membersSoftRemove).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve lançar 404 quando o membro não existe no escopo da base', async () => {
      membersFindOne.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        ApiException,
      );
    });
  });

  describe('listOptions', () => {
    it('deve buscar active+inactive, excluir deceased/transferred e excludeMemberId', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          baseMember({
            id: fatherId,
            fullName: 'José da Silva',
            gender: MemberGender.MALE,
          }),
        ]),
      };
      membersCreateQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.listOptions({
        q: 'Jos',
        limit: 15,
        excludeMemberId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'member.status IN (:...statuses)',
        { statuses: [MemberStatus.ACTIVE, MemberStatus.INACTIVE] },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'member.id != :excludeMemberId',
        { excludeMemberId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: fatherId,
          fullName: 'José da Silva',
        }),
      ]);
    });
  });

  describe('filiação', () => {
    it('create com pai selecionado sincroniza nome e orquestra família', async () => {
      const father = baseMember({
        id: fatherId,
        fullName: 'José da Silva',
        gender: MemberGender.MALE,
      });
      membersFind.mockResolvedValue([father]);
      membersFindOne.mockResolvedValue(null);
      const saved = baseMember({
        fatherMemberId: fatherId,
        fatherName: 'José da Silva',
        registrationNumber: '000001',
      });
      managerCreate.mockReturnValue(saved);
      managerSave.mockResolvedValue(saved);
      managerQuery
        .mockResolvedValueOnce([{ id: baseCongregationId }])
        .mockResolvedValueOnce([{ max_seq: 0 }]);

      const result = await service.create({
        ...createDto(),
        fatherMemberId: fatherId,
      });

      expect(managerCreate).toHaveBeenCalledWith(
        Member,
        expect.objectContaining({
          fatherMemberId: fatherId,
          fatherName: 'José da Silva',
        }),
      );
      expect(linkFiliationFamily).toHaveBeenCalledWith({
        childMemberId: saved.id,
        fatherMemberId: fatherId,
        motherMemberId: null,
        congregationId: baseCongregationId,
      });
      expect(result.familyLink?.linked).toBe(true);
    });

    it('create com conflito familiar não quebra o save do membro', async () => {
      const father = baseMember({
        id: fatherId,
        fullName: 'José da Silva',
      });
      const mother = baseMember({
        id: motherId,
        fullName: 'Ana da Silva',
        gender: MemberGender.FEMALE,
      });
      membersFind.mockResolvedValue([father, mother]);
      membersFindOne.mockResolvedValue(null);
      const saved = baseMember({
        fatherMemberId: fatherId,
        motherMemberId: motherId,
        fatherName: 'José da Silva',
        motherName: 'Ana da Silva',
        registrationNumber: '000001',
      });
      managerCreate.mockReturnValue(saved);
      managerSave.mockResolvedValue(saved);
      managerQuery
        .mockResolvedValueOnce([{ id: baseCongregationId }])
        .mockResolvedValueOnce([{ max_seq: 0 }]);
      linkFiliationFamily.mockResolvedValue({
        attempted: true,
        linked: false,
        skippedReason: 'PARENTS_IN_DIFFERENT_FAMILIES',
      });

      const result = await service.create({
        ...createDto(),
        fatherMemberId: fatherId,
        motherMemberId: motherId,
      });

      expect(result.id).toBe(saved.id);
      expect(result.familyLink).toEqual({
        attempted: true,
        linked: false,
        skippedReason: 'PARENTS_IN_DIFFERENT_FAMILIES',
      });
    });

    it('update limpa ID quando o nome diverge do vínculo', async () => {
      const father = baseMember({
        id: fatherId,
        fullName: 'José da Silva',
      });
      const member = baseMember({
        fatherMemberId: fatherId,
        fatherName: 'José da Silva',
      });
      membersFindOne.mockResolvedValue(member);
      membersFind.mockResolvedValue([father]);
      membersSave.mockImplementation((entity: Member) =>
        Promise.resolve(entity),
      );

      const result = await service.update(member.id, {
        fatherName: 'Nome Livre Digitado',
      });

      expect(result.fatherMemberId).toBeNull();
      expect(result.fatherName).toBe('Nome Livre Digitado');
      expect(linkFiliationFamily).not.toHaveBeenCalled();
    });

    it('create com linkFamily=false não orquestra família', async () => {
      const father = baseMember({
        id: fatherId,
        fullName: 'José da Silva',
      });
      membersFind.mockResolvedValue([father]);
      membersFindOne.mockResolvedValue(null);
      const saved = baseMember({
        fatherMemberId: fatherId,
        fatherName: 'José da Silva',
        registrationNumber: '000001',
      });
      managerCreate.mockReturnValue(saved);
      managerSave.mockResolvedValue(saved);
      managerQuery
        .mockResolvedValueOnce([{ id: baseCongregationId }])
        .mockResolvedValueOnce([{ max_seq: 0 }]);

      const result = await service.create({
        ...createDto(),
        fatherMemberId: fatherId,
        linkFamily: false,
      });

      expect(linkFiliationFamily).not.toHaveBeenCalled();
      expect(result.familyLink).toEqual({ attempted: false, linked: false });
    });
  });

  describe('contexto de congregação ativa', () => {
    it('findAll com activeCongregationId não chama getOrCreateBase', async () => {
      const explicitId = '22222222-3333-4444-5555-666666666666';
      const member = baseMember({ congregationId: explicitId });
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[member], 1]),
      };
      membersCreateQueryBuilder.mockReturnValue(queryBuilder);
      jest.clearAllMocks();
      getOrCreateBase.mockResolvedValue(baseCongregation());

      await service.findAll({ page: 1, limit: 20 }, explicitId);

      expect(getOrCreateBase).not.toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'member.congregationId = :congregationId',
        { congregationId: explicitId },
      );
    });
  });
});
