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
import { MissionAssignment } from './entities/mission-assignment.entity';
import { MissionAssignmentRole } from './enums/mission-assignment-role.enum';
import { MissionAssignmentStatus } from './enums/mission-assignment-status.enum';
import { MissionFieldsService } from './mission-fields.service';
import { MissionAssignmentsService } from './mission-assignments.service';

describe('MissionAssignmentsService', () => {
  let service: MissionAssignmentsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const assignmentId = '11111111-2222-3333-4444-555555555555';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const fieldId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

  const assignmentsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };
  const missionFieldsService = {
    getFieldOrFailInternal: jest.fn(),
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
    member.id = memberId;
    member.fullName = 'Maria da Silva';
    member.status = MemberStatus.ACTIVE;
    member.congregationId = baseCongregationId;
    return member;
  };

  const baseAssignment = (
    overrides?: Partial<MissionAssignment>,
  ): MissionAssignment => {
    const assignment = new MissionAssignment();
    assignment.id = assignmentId;
    assignment.congregationId = baseCongregationId;
    assignment.memberId = memberId;
    assignment.member = baseMember();
    assignment.missionFieldId = fieldId;
    assignment.missionField = {
      id: fieldId,
      name: 'África — Quênia',
    } as MissionAssignment['missionField'];
    assignment.role = MissionAssignmentRole.MISSIONARY;
    assignment.status = MissionAssignmentStatus.ACTIVE;
    assignment.startDate = '2026-01-15';
    assignment.expectedEndDate = '2028-01-15';
    assignment.actualEndDate = null;
    assignment.notes = null;
    assignment.createdAt = new Date('2026-07-18T00:00:00Z');
    assignment.updatedAt = new Date('2026-07-18T00:00:00Z');
    assignment.deletedAt = null;
    Object.assign(assignment, overrides);
    return assignment;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionAssignmentsService,
        {
          provide: getRepositoryToken(MissionAssignment),
          useValue: assignmentsRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: MissionFieldsService, useValue: missionFieldsService },
      ],
    }).compile();

    service = module.get(MissionAssignmentsService);
  });

  describe('create', () => {
    it('deve criar envio missionário', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      missionFieldsService.getFieldOrFailInternal.mockResolvedValue({});
      const saved = baseAssignment();
      assignmentsRepository.create.mockReturnValue(saved);
      assignmentsRepository.save.mockResolvedValue(saved);
      assignmentsRepository.findOne.mockResolvedValue(saved);

      const result = await service.create({
        memberId,
        missionFieldId: fieldId,
        startDate: '2026-01-15',
      });

      expect(membersRepository.findOne).toHaveBeenCalledWith({
        where: { id: memberId },
      });
      expect(result.memberName).toBe('Maria da Silva');
    });

    it('deve rejeitar datas inválidas', async () => {
      membersRepository.findOne.mockResolvedValue(baseMember());
      missionFieldsService.getFieldOrFailInternal.mockResolvedValue({});

      try {
        await service.create({
          memberId,
          missionFieldId: fieldId,
          startDate: '2026-06-01',
          expectedEndDate: '2026-01-01',
        });
        fail('deveria lançar ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MISSIONS_INVALID_DATES,
        });
      }
    });
  });

  describe('remove', () => {
    it('deve lançar NOT_FOUND quando envio não existe', async () => {
      assignmentsRepository.findOne.mockResolvedValue(null);

      try {
        await service.remove(assignmentId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });
});
