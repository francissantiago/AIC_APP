import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './entities/member.entity';
import { MemberGender } from './enums/member-gender.enum';
import { MemberMaritalStatus } from './enums/member-marital-status.enum';
import { MemberStatus } from './enums/member-status.enum';
import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;

  const membersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get(MembersService);
  });

  describe('create', () => {
    it('deve criar membro com defaults de gender, maritalStatus e status', async () => {
      membersRepository.findOne.mockResolvedValue(null);
      const saved = baseMember();
      membersRepository.create.mockReturnValue(saved);
      membersRepository.save.mockResolvedValue(saved);

      const result = await service.create(createDto());

      expect(membersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Maria da Silva',
          gender: MemberGender.UNSPECIFIED,
          maritalStatus: MemberMaritalStatus.OTHER,
          status: MemberStatus.ACTIVE,
        }),
      );
      expect(result.fullName).toBe('Maria da Silva');
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
      ).rejects.toThrow(UnprocessableEntityException);
      expect(membersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve paginar e aplicar filtros de status e busca q', async () => {
      const member = baseMember();
      const queryBuilder = {
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

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(1);
      expect(result.data[0].fullName).toBe('Maria da Silva');
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
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete via softRemove', async () => {
      const member = baseMember();
      membersRepository.findOne.mockResolvedValue(member);
      membersRepository.softRemove.mockResolvedValue(member);

      await service.remove(member.id);

      expect(membersRepository.softRemove).toHaveBeenCalledWith(member);
    });

    it('deve lançar 404 quando o membro não existe', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(membersRepository.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve lançar 404 quando o membro não existe', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
