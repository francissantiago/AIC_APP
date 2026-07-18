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
import { ClassesService } from './classes.service';
import { EbdClass } from './entities/class.entity';
import { ClassAgeGroup } from './enums/class-age-group.enum';
import { ClassStatus } from './enums/class-status.enum';

describe('ClassesService', () => {
  let service: ClassesService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const classId = '11111111-2222-3333-4444-555555555555';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const otherCongregationId = 'cccccccc-dddd-eeee-ffff-000000000099';

  const classesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
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

  const baseClass = (overrides?: Partial<EbdClass>): EbdClass => {
    const ebdClass = new EbdClass();
    ebdClass.id = classId;
    ebdClass.congregationId = baseCongregationId;
    ebdClass.name = 'Classe de Jovens';
    ebdClass.description = 'Turma da EBD';
    ebdClass.ageGroup = ClassAgeGroup.YOUTH;
    ebdClass.teacherMemberId = null;
    ebdClass.teacherMember = null;
    ebdClass.dayOfWeek = 0;
    ebdClass.startTime = '09:00:00';
    ebdClass.room = 'Sala 3';
    ebdClass.status = ClassStatus.ACTIVE;
    ebdClass.createdAt = new Date('2026-07-18T00:00:00Z');
    ebdClass.updatedAt = new Date('2026-07-18T00:00:00Z');
    ebdClass.deletedAt = null;
    Object.assign(ebdClass, overrides);
    return ebdClass;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: getRepositoryToken(EbdClass),
          useValue: classesRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: CongregationsService, useValue: congregationsService },
      ],
    }).compile();

    service = module.get(ClassesService);
  });

  describe('create', () => {
    it('deve criar turma associada à congregação-base', async () => {
      const saved = baseClass();
      classesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);
      classesRepository.create.mockReturnValue(saved);
      classesRepository.save.mockResolvedValue(saved);

      const result = await service.create({ name: 'Classe de Jovens' });

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
      expect(classesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Classe de Jovens',
          congregationId: baseCongregationId,
          status: ClassStatus.ACTIVE,
          ageGroup: ClassAgeGroup.MIXED,
          dayOfWeek: 0,
        }),
      );
      expect(result.name).toBe('Classe de Jovens');
      expect(result.congregationId).toBe(baseCongregationId);
    });

    it('deve lançar 409 NAME_IN_USE para nome duplicado', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());

      try {
        await service.create({ name: 'Classe de Jovens' });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_NAME_IN_USE,
        });
      }
      expect(classesRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar 404 TEACHER_NOT_FOUND para professor inexistente', async () => {
      classesRepository.findOne.mockResolvedValue(null);
      membersRepository.findOne.mockResolvedValue(null);

      try {
        await service.create({
          name: 'Classe de Jovens',
          teacherMemberId: memberId,
        });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_TEACHER_NOT_FOUND,
        });
      }
      expect(classesRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar 422 TEACHER_WRONG_CONGREGATION para outra congregação', async () => {
      classesRepository.findOne.mockResolvedValue(null);
      membersRepository.findOne.mockResolvedValue(
        baseMember({ congregationId: otherCongregationId }),
      );

      try {
        await service.create({
          name: 'Classe de Jovens',
          teacherMemberId: memberId,
        });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_TEACHER_WRONG_CONGREGATION,
        });
      }
      expect(classesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve desvincular professor com teacherMemberId null', async () => {
      const teacher = baseMember();
      const existing = baseClass({
        teacherMemberId: memberId,
        teacherMember: teacher,
      });
      const updated = baseClass({
        teacherMemberId: null,
        teacherMember: null,
      });
      classesRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      classesRepository.save.mockResolvedValue(updated);

      const result = await service.update(classId, { teacherMemberId: null });

      expect(classesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ teacherMemberId: null }),
      );
      expect(result.teacherMemberId).toBeNull();
      expect(result.teacher).toBeNull();
    });
  });

  describe('remove', () => {
    it('deve soft delete e findOne posterior falha com 404', async () => {
      const ebdClass = baseClass();
      classesRepository.findOne
        .mockResolvedValueOnce(ebdClass)
        .mockResolvedValueOnce(null);
      classesRepository.softRemove.mockResolvedValue(ebdClass);

      await service.remove(classId);

      expect(classesRepository.softRemove).toHaveBeenCalledWith(ebdClass);
      try {
        await service.findOne(classId);
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_NOT_FOUND,
        });
      }
    });
  });

  describe('listTeacherOptions', () => {
    it('filtra congregação, ativos, q e limit', async () => {
      const member = baseMember();
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([member]),
      };
      membersRepository.createQueryBuilder.mockReturnValue(qb);

      const options = await service.listTeacherOptions({ q: 'Mar', limit: 10 });

      expect(qb.where).toHaveBeenCalledWith(
        'member.congregationId = :congregationId',
        { congregationId: baseCongregationId },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('member.status = :status', {
        status: MemberStatus.ACTIVE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('member.fullName LIKE :q', {
        q: '%Mar%',
      });
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(options).toEqual([{ id: member.id, fullName: member.fullName }]);
    });
  });
});
