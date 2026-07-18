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
import { ClassAttendance } from './entities/class-attendance.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { EbdClass } from './entities/class.entity';
import { ClassAgeGroup } from './enums/class-age-group.enum';
import { ClassEnrollmentStatus } from './enums/class-enrollment-status.enum';
import { ClassStatus } from './enums/class-status.enum';

describe('ClassesService', () => {
  let service: ClassesService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const classId = '11111111-2222-3333-4444-555555555555';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const otherMemberId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const otherCongregationId = 'cccccccc-dddd-eeee-ffff-000000000099';
  const attendanceId = 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb';

  const classesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const enrollmentsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const attendanceRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
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

  const baseEnrollment = (
    overrides?: Partial<ClassEnrollment>,
  ): ClassEnrollment => {
    const link = new ClassEnrollment();
    link.classId = classId;
    link.memberId = memberId;
    link.status = ClassEnrollmentStatus.ACTIVE;
    link.enrolledAt = new Date('2026-07-18T12:00:00Z');
    link.member = baseMember();
    Object.assign(link, overrides);
    return link;
  };

  const baseAttendance = (
    overrides?: Partial<ClassAttendance>,
  ): ClassAttendance => {
    const row = new ClassAttendance();
    row.id = attendanceId;
    row.classId = classId;
    row.memberId = memberId;
    row.sessionDate = '2026-07-13';
    row.present = true;
    row.notes = null;
    row.createdAt = new Date('2026-07-13T12:00:00Z');
    row.updatedAt = new Date('2026-07-13T12:00:00Z');
    Object.assign(row, overrides);
    return row;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    enrollmentsRepository.count.mockResolvedValue(0);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: getRepositoryToken(EbdClass),
          useValue: classesRepository,
        },
        {
          provide: getRepositoryToken(ClassEnrollment),
          useValue: enrollmentsRepository,
        },
        {
          provide: getRepositoryToken(ClassAttendance),
          useValue: attendanceRepository,
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
      expect(result.enrollmentsCount).toBe(0);
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

  describe('enrollments', () => {
    it('deve matricular aluno com sucesso', async () => {
      const ebdClass = baseClass();
      const member = baseMember();
      const link = baseEnrollment();
      classesRepository.findOne.mockResolvedValue(ebdClass);
      membersRepository.findOne.mockResolvedValue(member);
      enrollmentsRepository.findOne.mockResolvedValue(null);
      enrollmentsRepository.create.mockReturnValue(link);
      enrollmentsRepository.save.mockResolvedValue(link);

      const result = await service.addEnrollment(classId, { memberId });

      expect(result.memberId).toBe(memberId);
      expect(result.memberFullName).toBe('Maria da Silva');
      expect(result.status).toBe(ClassEnrollmentStatus.ACTIVE);
      expect(enrollmentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          classId,
          memberId,
          status: ClassEnrollmentStatus.ACTIVE,
        }),
      );
    });

    it('deve lançar 409 ENROLLMENT_ALREADY_EXISTS para duplicata', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      membersRepository.findOne.mockResolvedValue(baseMember());
      enrollmentsRepository.findOne.mockResolvedValue(baseEnrollment());

      try {
        await service.addEnrollment(classId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_ENROLLMENT_ALREADY_EXISTS,
        });
      }
      expect(enrollmentsRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar 422 ENROLLMENT_MEMBER_WRONG_CONGREGATION', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      membersRepository.findOne.mockResolvedValue(
        baseMember({ congregationId: otherCongregationId }),
      );

      try {
        await service.addEnrollment(classId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION,
        });
      }
    });

    it('deve lançar 404 CLASSES.NOT_FOUND para turma inexistente', async () => {
      classesRepository.findOne.mockResolvedValue(null);

      try {
        await service.addEnrollment(classId, { memberId });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_NOT_FOUND,
        });
      }
    });

    it('deve alterar status via PATCH', async () => {
      const link = baseEnrollment();
      classesRepository.findOne.mockResolvedValue(baseClass());
      enrollmentsRepository.findOne.mockResolvedValue(link);
      const updated = baseEnrollment({
        status: ClassEnrollmentStatus.TRANSFERRED,
      });
      enrollmentsRepository.save.mockResolvedValue(updated);

      const result = await service.updateEnrollmentStatus(classId, memberId, {
        status: ClassEnrollmentStatus.TRANSFERRED,
      });

      expect(enrollmentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ClassEnrollmentStatus.TRANSFERRED,
        }),
      );
      expect(result.status).toBe(ClassEnrollmentStatus.TRANSFERRED);
    });

    it('deve hard delete matrícula', async () => {
      const link = baseEnrollment();
      classesRepository.findOne.mockResolvedValue(baseClass());
      enrollmentsRepository.findOne.mockResolvedValue(link);
      enrollmentsRepository.remove.mockResolvedValue(link);

      await service.removeEnrollment(classId, memberId);

      expect(enrollmentsRepository.remove).toHaveBeenCalledWith(link);
    });

    it('enrollment-options exclui já matriculados', async () => {
      const member = baseMember();
      classesRepository.findOne.mockResolvedValue(baseClass());
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([member]),
      };
      membersRepository.createQueryBuilder.mockReturnValue(qb);

      const options = await service.listEnrollmentOptions(classId, {
        q: 'Mar',
        limit: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('NOT EXISTS'),
        { classId },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('member.status = :status', {
        status: MemberStatus.ACTIVE,
      });
      expect(options).toEqual([{ id: member.id, fullName: member.fullName }]);
    });

    it('enrollmentsCount conta apenas status active', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      enrollmentsRepository.count.mockResolvedValue(3);

      const result = await service.findOne(classId);

      expect(enrollmentsRepository.count).toHaveBeenCalledWith({
        where: {
          classId,
          status: ClassEnrollmentStatus.ACTIVE,
        },
      });
      expect(result.enrollmentsCount).toBe(3);
    });

    it('findByMemberId retorna resumo das turmas do membro', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      const enrollment = baseEnrollment({
        ebdClass: baseClass(),
      });
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([enrollment]),
      };
      enrollmentsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByMemberId(memberId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: classId,
        name: 'Classe de Jovens',
        ageGroup: ClassAgeGroup.YOUTH,
        status: ClassStatus.ACTIVE,
        enrollmentStatus: ClassEnrollmentStatus.ACTIVE,
      });
    });
  });

  describe('attendance', () => {
    it('GET folha mescla enrollments active com attendance da sessão', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      const enrolled = baseEnrollment();
      const withoutRow = baseEnrollment({
        memberId: otherMemberId,
        member: baseMember({
          id: otherMemberId,
          fullName: 'João Pereira',
        }),
      });
      const enrollQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([enrolled, withoutRow]),
      };
      enrollmentsRepository.createQueryBuilder.mockReturnValue(enrollQb);
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({ notes: 'Chegou atrasado' }),
      ]);

      const sheet = await service.getSessionAttendance(classId, {
        sessionDate: '2026-07-13',
      });

      expect(sheet.classId).toBe(classId);
      expect(sheet.sessionDate).toBe('2026-07-13');
      expect(sheet.entries).toHaveLength(2);
      expect(sheet.entries[0]).toMatchObject({
        memberId,
        memberFullName: 'Maria da Silva',
        attendanceId,
        present: true,
        notes: 'Chegou atrasado',
      });
      expect(sheet.entries[1]).toMatchObject({
        memberId: otherMemberId,
        attendanceId: null,
        present: null,
        notes: null,
      });
    });

    it('PUT upsert cria e atualiza presença', async () => {
      const ebdClass = baseClass();
      classesRepository.findOne.mockResolvedValue(ebdClass);
      enrollmentsRepository.find.mockResolvedValue([baseEnrollment()]);
      attendanceRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseAttendance({ present: true }));
      const created = baseAttendance({ present: true });
      attendanceRepository.create.mockReturnValue(created);
      attendanceRepository.save
        .mockResolvedValueOnce(created)
        .mockResolvedValueOnce(baseAttendance({ present: false }));

      const enrollQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseEnrollment()]),
      };
      enrollmentsRepository.createQueryBuilder.mockReturnValue(enrollQb);
      attendanceRepository.find.mockResolvedValue([
        baseAttendance({ present: false }),
      ]);

      await service.upsertSessionAttendance(classId, {
        sessionDate: '2026-07-13',
        entries: [{ memberId, present: true }],
      });
      expect(attendanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          classId,
          memberId,
          sessionDate: '2026-07-13',
          present: true,
        }),
      );

      const updated = await service.upsertSessionAttendance(classId, {
        sessionDate: '2026-07-13',
        entries: [{ memberId, present: false, notes: 'Falta justificada' }],
      });
      expect(attendanceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          present: false,
          notes: 'Falta justificada',
        }),
      );
      expect(updated.entries[0].present).toBe(false);
    });

    it('PUT rejeita membro sem matrícula active', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      enrollmentsRepository.find.mockResolvedValue([]);

      try {
        await service.upsertSessionAttendance(classId, {
          sessionDate: '2026-07-13',
          entries: [{ memberId, present: true }],
        });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED,
        });
      }
      expect(attendanceRepository.save).not.toHaveBeenCalled();
    });

    it('relatório % correto com 2 sessões e 1 falta', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      const attendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            baseAttendance({ sessionDate: '2026-07-06', present: true }),
            baseAttendance({ sessionDate: '2026-07-13', present: false }),
          ]),
      };
      attendanceRepository.createQueryBuilder.mockReturnValue(attendanceQb);
      const enrollQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseEnrollment()]),
      };
      enrollmentsRepository.createQueryBuilder.mockReturnValue(enrollQb);

      const report = await service.getFrequencyReport(classId, {
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(report.sessionsCount).toBe(2);
      expect(report.members[0]).toMatchObject({
        memberId,
        presentCount: 1,
        absentCount: 1,
        frequencyPct: 50,
      });
      expect(report.classAveragePct).toBe(50);
    });

    it('período > 24 meses lança 422 ATTENDANCE_PERIOD_INVALID', async () => {
      try {
        await service.getFrequencyReport(classId, {
          from: '2024-01-01',
          to: '2026-02-01',
        });
        fail('esperava ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.CLASSES_ATTENDANCE_PERIOD_INVALID,
        });
      }
      expect(classesRepository.findOne).not.toHaveBeenCalled();
    });

    it('CSV retorna BOM e header', async () => {
      classesRepository.findOne.mockResolvedValue(baseClass());
      const attendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            baseAttendance({ sessionDate: '2026-07-06', present: true }),
          ]),
      };
      attendanceRepository.createQueryBuilder.mockReturnValue(attendanceQb);
      const enrollQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseEnrollment()]),
      };
      enrollmentsRepository.createQueryBuilder.mockReturnValue(enrollQb);

      const csv = await service.exportFrequencyCsv(classId, {
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain(
        '"Membro";"Presenças";"Faltas";"Frequência %";"Sessões";"Turma";"De";"Até";"Média da turma %"',
      );
      expect(csv).toContain('Maria da Silva');
      expect(csv).toContain(';');
    });
  });
});
