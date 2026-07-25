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
import { MissionField } from './entities/mission-field.entity';
import { MissionFieldStatus } from './enums/mission-field-status.enum';
import { MissionFieldsService } from './mission-fields.service';

describe('MissionFieldsService', () => {
  let service: MissionFieldsService;

  const baseCongregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const fieldId = '11111111-2222-3333-4444-555555555555';

  const missionFieldsRepository = {
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

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = baseCongregationId;
    congregation.name = 'Congregação';
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.status = CongregationStatus.ACTIVE;
    return congregation;
  };

  const baseField = (overrides?: Partial<MissionField>): MissionField => {
    const field = new MissionField();
    field.id = fieldId;
    field.congregationId = baseCongregationId;
    field.name = 'África — Quênia';
    field.country = 'Quênia';
    field.city = 'Nairobi';
    field.region = null;
    field.description = null;
    field.coordinatorMemberId = null;
    field.coordinatorMember = null;
    field.status = MissionFieldStatus.ACTIVE;
    field.createdAt = new Date('2026-07-18T00:00:00Z');
    field.updatedAt = new Date('2026-07-18T00:00:00Z');
    field.deletedAt = null;
    Object.assign(field, overrides);
    return field;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue(baseCongregation());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionFieldsService,
        {
          provide: getRepositoryToken(MissionField),
          useValue: missionFieldsRepository,
        },
        { provide: getRepositoryToken(Member), useValue: membersRepository },
        { provide: CongregationsService, useValue: congregationsService },
      ],
    }).compile();

    service = module.get(MissionFieldsService);
  });

  describe('create', () => {
    it('deve criar campo missionário associado à congregação-base', async () => {
      missionFieldsRepository.findOne.mockResolvedValue(null);
      const saved = baseField();
      missionFieldsRepository.create.mockReturnValue(saved);
      missionFieldsRepository.save.mockResolvedValue(saved);
      missionFieldsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);

      const result = await service.create({
        name: 'África — Quênia',
        country: 'Quênia',
      });

      expect(congregationsService.getOrCreateBase).toHaveBeenCalled();
      expect(missionFieldsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          congregationId: baseCongregationId,
          name: 'África — Quênia',
          country: 'Quênia',
        }),
      );
      expect(result.name).toBe('África — Quênia');
    });

    it('deve rejeitar nome duplicado na congregação', async () => {
      missionFieldsRepository.findOne.mockResolvedValue(baseField());

      try {
        await service.create({ name: 'África — Quênia', country: 'Quênia' });
        fail('deveria lançar ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.CONFLICT);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.MISSIONS_FIELD_NAME_IN_USE,
        });
      }
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete do campo', async () => {
      const field = baseField();
      missionFieldsRepository.findOne.mockResolvedValue(field);
      missionFieldsRepository.softRemove.mockResolvedValue(field);

      await service.remove(fieldId);

      expect(missionFieldsRepository.softRemove).toHaveBeenCalledWith(field);
    });

    it('deve lançar NOT_FOUND quando campo não existe', async () => {
      missionFieldsRepository.findOne.mockResolvedValue(null);

      try {
        await service.remove(fieldId);
        fail('deveria lançar ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });
});
