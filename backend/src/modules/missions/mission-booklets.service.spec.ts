import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { CongregationsService } from '../congregations/congregations.service';
import { CongregationStatus } from '../congregations/enums/congregation-status.enum';
import { CongregationType } from '../congregations/enums/congregation-type.enum';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MissionBookletInstallment } from './entities/mission-booklet-installment.entity';
import { MissionBooklet } from './entities/mission-booklet.entity';
import { MissionBookletDestinationType } from './enums/mission-booklet-destination-type.enum';
import { MissionBookletInstallmentStatus } from './enums/mission-booklet-installment-status.enum';
import { MissionBookletStatus } from './enums/mission-booklet-status.enum';
import { MissionAssignmentsService } from './mission-assignments.service';
import { MissionBookletsService } from './mission-booklets.service';
import { MissionFieldsService } from './mission-fields.service';

describe('MissionBookletsService', () => {
  let service: MissionBookletsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const memberId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const bookletId = '11111111-2222-3333-4444-555555555555';
  const installmentId = '22222222-3333-4444-5555-666666666666';
  const user: UserResponseDto = {
    id: 'user-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    status: 'active',
    permissions: ['missions:write'],
  } as UserResponseDto;

  const bookletsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const installmentsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = { findOne: jest.fn() };
  const entriesRepository = { create: jest.fn(), save: jest.fn() };
  const categoriesRepository = { findOne: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  const congregationsService = { getOrCreateBase: jest.fn() };
  const missionFieldsService = { getFieldOrFailInternal: jest.fn() };
  const missionAssignmentsService = { getAssignmentOrFailInternal: jest.fn() };

  const baseMember = (): Member => {
    const member = new Member();
    member.id = memberId;
    member.fullName = 'Maria da Silva';
    member.status = MemberStatus.ACTIVE;
    member.congregationId = baseCongregationId;
    return member;
  };

  const baseBooklet = (): MissionBooklet => {
    const booklet = new MissionBooklet();
    booklet.id = bookletId;
    booklet.congregationId = baseCongregationId;
    booklet.memberId = memberId;
    booklet.member = baseMember();
    booklet.destinationType = MissionBookletDestinationType.GENERAL;
    booklet.missionFieldId = null;
    booklet.missionAssignmentId = null;
    booklet.title = 'Carnê geral';
    booklet.installmentCount = 2;
    booklet.installmentAmount = '50.00';
    booklet.totalAmount = '100.00';
    booklet.firstDueDate = '2026-08-01';
    booklet.status = MissionBookletStatus.ACTIVE;
    booklet.notes = null;
    booklet.createdByUserId = user.id;
    booklet.createdAt = new Date('2026-07-26T00:00:00Z');
    booklet.updatedAt = new Date('2026-07-26T00:00:00Z');
    booklet.deletedAt = null;
    return booklet;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue({
      id: baseCongregationId,
      type: CongregationType.HEADQUARTERS,
      status: CongregationStatus.ACTIVE,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionBookletsService,
        {
          provide: getRepositoryToken(MissionBooklet),
          useValue: bookletsRepository,
        },
        {
          provide: getRepositoryToken(MissionBookletInstallment),
          useValue: installmentsRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        {
          provide: getRepositoryToken(FinancialEntry),
          useValue: entriesRepository,
        },
        {
          provide: getRepositoryToken(FinancialCategory),
          useValue: categoriesRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: MissionFieldsService, useValue: missionFieldsService },
        {
          provide: MissionAssignmentsService,
          useValue: missionAssignmentsService,
        },
      ],
    }).compile();

    service = module.get(MissionBookletsService);
  });

  describe('payInstallment', () => {
    it('deve rejeitar parcela já quitada', async () => {
      const booklet = baseBooklet();
      bookletsRepository.findOne.mockResolvedValue(booklet);
      installmentsRepository.findOne.mockResolvedValue({
        id: installmentId,
        bookletId,
        status: MissionBookletInstallmentStatus.PAID,
      });

      try {
        await service.payInstallment(
          bookletId,
          installmentId,
          { paymentMethod: 'cash' as never },
          user,
        );
        fail('deveria lançar ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MISSIONS_BOOKLET_INSTALLMENT_ALREADY_PAID,
        });
      }
    });
  });
});
