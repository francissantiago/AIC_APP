import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Congregation } from '../congregations/entities/congregation.entity';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
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

  const membersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(async (cb: (m: unknown) => Promise<unknown>) =>
        cb(membersRepository.manager),
      ),
    },
  };
  const usersRepository = {
    findOne: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
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

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = baseCongregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseMember = (): Member => {
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
    member.positionTitle = null;
    member.photoPath = null;
    member.congregationId = baseCongregationId;
    member.userId = null;
    member.user = null;
    member.createdAt = new Date('2026-07-17T00:00:00Z');
    member.updatedAt = new Date('2026-07-17T00:00:00Z');
    member.deletedAt = null;
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
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
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
      ],
    }).compile();

    service = module.get(MembersService);
  });

  describe('create', () => {
    it('deve criar membro associado à congregação-base', async () => {
      membersRepository.findOne.mockResolvedValue(null);
      const saved = baseMember();
      saved.registrationNumber = '000001';
      membersRepository.manager.create.mockReturnValue(saved);
      membersRepository.manager.save.mockResolvedValue(saved);
      membersRepository.manager.query
        .mockResolvedValueOnce([{ id: baseCongregationId }])
        .mockResolvedValueOnce([{ max_seq: 0 }]);

      const result = await service.create(createDto());

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
      expect(membersRepository.manager.create).toHaveBeenCalledWith(
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
      membersRepository.findOne.mockResolvedValue(null);
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          ...createDto(),
          userId: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
        }),
      ).rejects.toThrow(ApiException);
      expect(membersRepository.manager.save).not.toHaveBeenCalled();
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
      membersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        status: MemberStatus.ACTIVE,
        q: 'silva',
      });

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
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
      membersRepository.findOne
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(other);

      await expect(
        service.update(member.id, { email: 'outro@igreja.org' }),
      ).rejects.toThrow(ApiException);
    });

    it('deve lançar 404 quando o membro está fora do escopo da base', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('id-fora-do-escopo', { fullName: 'Outro' }),
      ).rejects.toThrow(ApiException);
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete via softRemove', async () => {
      const member = baseMember();
      membersRepository.findOne.mockResolvedValue(member);
      membersRepository.softRemove.mockResolvedValue(member);

      await service.remove(member.id);

      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: member.id, congregationId: baseCongregationId },
      });
      expect(membersRepository.softRemove).toHaveBeenCalledWith(member);
    });

    it('deve lançar 404 quando o membro não existe', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('id-inexistente')).rejects.toThrow(
        ApiException,
      );
      expect(membersRepository.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve lançar 404 quando o membro não existe no escopo da base', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        ApiException,
      );
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
      membersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      jest.clearAllMocks();
      congregationsService.getOrCreateBase.mockResolvedValue(
        baseCongregation(),
      );

      await service.findAll({ page: 1, limit: 20 }, explicitId);

      expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'member.congregationId = :congregationId',
        { congregationId: explicitId },
      );
    });
  });
});
