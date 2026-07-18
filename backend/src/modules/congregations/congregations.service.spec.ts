import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CongregationsService } from './congregations.service';
import { Congregation } from './entities/congregation.entity';
import { CongregationStatus } from './enums/congregation-status.enum';
import { CongregationType } from './enums/congregation-type.enum';

describe('CongregationsService', () => {
  let service: CongregationsService;

  const congregationsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const baseCongregation = (): Congregation => {
    const congregation = new Congregation();
    congregation.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    congregation.name = 'Congregação';
    congregation.tradeName = null;
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.document = null;
    congregation.email = null;
    congregation.phone = null;
    congregation.address = null;
    congregation.city = null;
    congregation.state = null;
    congregation.zipCode = null;
    congregation.foundationDate = null;
    congregation.website = null;
    congregation.status = CongregationStatus.ACTIVE;
    congregation.notes = null;
    congregation.createdAt = new Date('2026-07-17T00:00:00Z');
    congregation.updatedAt = new Date('2026-07-17T00:00:00Z');
    congregation.deletedAt = null;
    return congregation;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CongregationsService,
        {
          provide: getRepositoryToken(Congregation),
          useValue: congregationsRepository,
        },
      ],
    }).compile();

    service = module.get(CongregationsService);
  });

  describe('getOrCreateBase', () => {
    it('deve criar a congregação-base quando não existir nenhuma ativa', async () => {
      congregationsRepository.find.mockResolvedValue([]);
      const created = baseCongregation();
      congregationsRepository.create.mockReturnValue(created);
      congregationsRepository.save.mockResolvedValue(created);

      const result = await service.getOrCreateBase();

      expect(congregationsRepository.create).toHaveBeenCalledWith({
        name: 'Congregação',
        type: CongregationType.HEADQUARTERS,
        status: CongregationStatus.ACTIVE,
      });
      expect(result.id).toBe(created.id);
    });

    it('deve retornar a congregação existente quando já houver uma ativa', async () => {
      const existing = baseCongregation();
      congregationsRepository.find.mockResolvedValue([existing]);

      const result = await service.getOrCreateBase();

      expect(result).toBe(existing);
      expect(congregationsRepository.create).not.toHaveBeenCalled();
      expect(congregationsRepository.save).not.toHaveBeenCalled();
    });

    it('deve soft-deletar extras e manter a mais antiga quando houver mais de uma ativa', async () => {
      const oldest = baseCongregation();
      const newer = baseCongregation();
      newer.id = '11111111-2222-3333-4444-555555555555';
      newer.name = 'Extra';
      congregationsRepository.find.mockResolvedValue([oldest, newer]);
      congregationsRepository.softRemove.mockResolvedValue([newer]);

      const result = await service.getOrCreateBase();

      expect(result).toBe(oldest);
      expect(congregationsRepository.softRemove).toHaveBeenCalledWith([newer]);
    });
  });

  describe('getBase', () => {
    it('deve retornar DTO da congregação-base', async () => {
      const existing = baseCongregation();
      congregationsRepository.find.mockResolvedValue([existing]);

      const result = await service.getBase();

      expect(result.id).toBe(existing.id);
      expect(result.name).toBe('Congregação');
      expect(result).not.toHaveProperty('deletedAt');
    });
  });

  describe('updateBase', () => {
    it('deve atualizar campos parciais da congregação-base', async () => {
      const congregation = baseCongregation();
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.save.mockImplementation((entity: Congregation) =>
        Promise.resolve(entity),
      );

      const result = await service.updateBase({
        tradeName: 'AIC Matriz',
        type: CongregationType.BRANCH,
      });

      expect(result.tradeName).toBe('AIC Matriz');
      expect(result.type).toBe(CongregationType.BRANCH);
    });

    it('deve lançar 409 quando o novo email pertence a outra congregação', async () => {
      const congregation = baseCongregation();
      const other = baseCongregation();
      other.id = '11111111-2222-3333-4444-555555555555';
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne.mockResolvedValue(other);

      await expect(
        service.updateBase({ email: 'outro@aic.org' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve lançar 409 quando o novo document pertence a outra congregação', async () => {
      const congregation = baseCongregation();
      const other = baseCongregation();
      other.id = '11111111-2222-3333-4444-555555555555';
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne.mockResolvedValue(other);

      await expect(
        service.updateBase({ document: '12.345.678/0001-99' }),
      ).rejects.toThrow(ConflictException);
    });

    it('não deve criar dois ativos em chamadas sequenciais com base existente', async () => {
      const existing = baseCongregation();
      congregationsRepository.find.mockResolvedValue([existing]);
      congregationsRepository.save.mockImplementation((entity: Congregation) =>
        Promise.resolve(entity),
      );

      await service.updateBase({ name: 'Nome A' });
      await service.updateBase({ name: 'Nome B' });

      expect(congregationsRepository.create).not.toHaveBeenCalled();
      expect(congregationsRepository.find).toHaveBeenCalledTimes(2);
    });
  });
});
