import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
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
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const headquartersId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const branchId = '11111111-2222-3333-4444-555555555555';

  const baseCongregation = (
    overrides: Partial<Congregation> = {},
  ): Congregation => {
    const congregation = new Congregation();
    congregation.id = headquartersId;
    congregation.name = 'Congregação';
    congregation.tradeName = null;
    congregation.type = CongregationType.HEADQUARTERS;
    congregation.parentId = null;
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
    Object.assign(congregation, overrides);
    return congregation;
  };

  const baseBranch = (overrides: Partial<Congregation> = {}): Congregation =>
    baseCongregation({
      id: branchId,
      name: 'Filial Zona Norte',
      type: CongregationType.BRANCH,
      parentId: headquartersId,
      ...overrides,
    });

  const expectApiError = async (
    promise: Promise<unknown>,
    status: HttpStatus,
    code: string,
  ): Promise<void> => {
    try {
      await promise;
      fail('esperava ApiException');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(status);
      expect((error as ApiException).getResponse()).toMatchObject({ code });
    }
  };

  beforeEach(async () => {
    jest.resetAllMocks();
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
    it('deve criar a congregação-base quando não existir nenhuma HQ ativa', async () => {
      congregationsRepository.find.mockResolvedValue([]);
      const created = baseCongregation();
      congregationsRepository.create.mockReturnValue(created);
      congregationsRepository.save.mockResolvedValue(created);

      const result = await service.getOrCreateBase();

      expect(congregationsRepository.create).toHaveBeenCalledWith({
        name: 'Congregação',
        type: CongregationType.HEADQUARTERS,
        status: CongregationStatus.ACTIVE,
        parentId: null,
      });
      expect(result.id).toBe(created.id);
    });

    it('deve retornar a HQ existente sem criar nem tocar em filiais', async () => {
      const existing = baseCongregation();
      congregationsRepository.find.mockResolvedValue([existing]);

      const result = await service.getOrCreateBase();

      expect(result).toBe(existing);
      expect(congregationsRepository.create).not.toHaveBeenCalled();
      expect(congregationsRepository.save).not.toHaveBeenCalled();
      expect(congregationsRepository.softRemove).not.toHaveBeenCalled();
    });

    it('regressão: com 2 HQs ativas, retorna a mais antiga e NÃO chama softRemove', async () => {
      const oldest = baseCongregation();
      const newer = baseCongregation({
        id: '22222222-3333-4444-5555-666666666666',
        name: 'Extra',
      });
      congregationsRepository.find.mockResolvedValue([oldest, newer]);

      const result = await service.getOrCreateBase();

      expect(result).toBe(oldest);
      expect(congregationsRepository.softRemove).not.toHaveBeenCalled();
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

    it('deve retornar filial quando activeCongregationId é passado', async () => {
      const branch = baseBranch();
      congregationsRepository.findOne.mockResolvedValue(branch);

      const result = await service.getBase(branch.id);

      expect(result.id).toBe(branch.id);
      expect(congregationsRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('updateBase / update (updateNode)', () => {
    it('deve atualizar campos parciais da congregação-base', async () => {
      const congregation = baseCongregation();
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne.mockResolvedValue(congregation);
      congregationsRepository.save.mockImplementation((entity: Congregation) =>
        Promise.resolve(entity),
      );

      const result = await service.updateBase({ tradeName: 'AIC Matriz' });

      expect(result.tradeName).toBe('AIC Matriz');
      expect(result.type).toBe(CongregationType.HEADQUARTERS);
    });

    it('deve atualizar filial ativa quando activeCongregationId é passado', async () => {
      const branch = baseBranch();
      congregationsRepository.findOne.mockResolvedValue(branch);
      congregationsRepository.save.mockImplementation((entity: Congregation) =>
        Promise.resolve(entity),
      );

      const result = await service.updateBase(
        { tradeName: 'Filial Atualizada' },
        branch.id,
      );

      expect(result.id).toBe(branch.id);
      expect(result.tradeName).toBe('Filial Atualizada');
      expect(congregationsRepository.find).not.toHaveBeenCalled();
    });

    it('deve aceitar reenvio de type igual ao atual como no-op (compatibilidade com frontend legado)', async () => {
      const congregation = baseCongregation();
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne.mockResolvedValue(congregation);
      congregationsRepository.save.mockImplementation((entity: Congregation) =>
        Promise.resolve(entity),
      );

      const result = await service.updateBase({
        type: CongregationType.HEADQUARTERS,
      });

      expect(result.type).toBe(CongregationType.HEADQUARTERS);
    });

    it('deve lançar 422 CONGREGATIONS_TYPE_LOCKED quando type divergir do atual', async () => {
      const congregation = baseCongregation();
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne.mockResolvedValue(congregation);

      await expectApiError(
        service.updateBase({ type: CongregationType.BRANCH }),
        HttpStatus.UNPROCESSABLE_ENTITY,
        ApiErrorCode.CONGREGATIONS_TYPE_LOCKED,
      );
      expect(congregationsRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar 409 quando o novo email pertence a outra congregação', async () => {
      const congregation = baseCongregation();
      const other = baseCongregation({ id: branchId });
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne
        .mockResolvedValueOnce(congregation)
        .mockResolvedValueOnce(other);

      await expectApiError(
        service.updateBase({ email: 'outro@aic.org' }),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE,
      );
    });

    it('deve lançar 409 quando o novo document pertence a outra congregação', async () => {
      const congregation = baseCongregation();
      const other = baseCongregation({ id: branchId });
      congregationsRepository.find.mockResolvedValue([congregation]);
      congregationsRepository.findOne
        .mockResolvedValueOnce(congregation)
        .mockResolvedValueOnce(other);

      await expectApiError(
        service.updateBase({ document: '12.345.678/0001-99' }),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
      );
    });

    it('deve lançar 404 CONGREGATIONS_NOT_FOUND ao atualizar id inexistente via update()', async () => {
      congregationsRepository.findOne.mockResolvedValue(null);

      await expectApiError(
        service.update('99999999-9999-9999-9999-999999999999', { name: 'X' }),
        HttpStatus.NOT_FOUND,
        ApiErrorCode.CONGREGATIONS_NOT_FOUND,
      );
    });
  });

  describe('findAll', () => {
    const buildQueryBuilder = (
      data: Congregation[],
      total: number,
    ): Record<string, jest.Mock> => ({
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    });

    it('sem filtros retorna HQ + filiais paginado, HQ sempre primeiro', async () => {
      const hq = baseCongregation();
      const branch = baseBranch();
      const qb = buildQueryBuilder([hq, branch], 2);
      congregationsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.data[0].id).toBe(hq.id);
      expect(result.data[1].id).toBe(branch.id);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('filtro type=branch aplica andWhere de type', async () => {
      const branch = baseBranch();
      const qb = buildQueryBuilder([branch], 1);
      congregationsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        type: CongregationType.BRANCH,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('congregation.type = :type', {
        type: CongregationType.BRANCH,
      });
      expect(result.data).toHaveLength(1);
    });

    it('filtro q busca por name/tradeName', async () => {
      const branch = baseBranch();
      const qb = buildQueryBuilder([branch], 1);
      congregationsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 20, q: 'zona norte' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(congregation.name LIKE :q OR congregation.tradeName LIKE :q)',
        { q: '%zona norte%' },
      );
    });

    it('aplica skip/take conforme page/limit', async () => {
      const qb = buildQueryBuilder([], 0);
      congregationsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });
  });

  describe('getById', () => {
    it('retorna HQ por id com branchesCount', async () => {
      const hq = baseCongregation();
      congregationsRepository.findOne.mockResolvedValue(hq);
      congregationsRepository.count.mockResolvedValue(2);

      const result = await service.getById(hq.id);

      expect(result.id).toBe(hq.id);
      expect(result.branchesCount).toBe(2);
    });

    it('retorna filial por id sem branchesCount', async () => {
      const branch = baseBranch();
      congregationsRepository.findOne.mockResolvedValue(branch);

      const result = await service.getById(branch.id);

      expect(result.id).toBe(branch.id);
      expect(result.branchesCount).toBeUndefined();
      expect(congregationsRepository.count).not.toHaveBeenCalled();
    });

    it('lança 404 CONGREGATIONS_NOT_FOUND para id inexistente', async () => {
      congregationsRepository.findOne.mockResolvedValue(null);

      await expectApiError(
        service.getById('99999999-9999-9999-9999-999999999999'),
        HttpStatus.NOT_FOUND,
        ApiErrorCode.CONGREGATIONS_NOT_FOUND,
      );
    });
  });

  describe('createBranch', () => {
    it('sucesso sem parentId (resolve HQ automaticamente)', async () => {
      const hq = baseCongregation();
      congregationsRepository.find.mockResolvedValue([hq]);
      congregationsRepository.findOne.mockResolvedValue(null);
      const created = baseBranch();
      congregationsRepository.create.mockReturnValue(created);
      congregationsRepository.save.mockResolvedValue(created);

      const result = await service.createBranch({ name: 'Filial Zona Norte' });

      expect(congregationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: CongregationType.BRANCH,
          parentId: hq.id,
        }),
      );
      expect(result.type).toBe(CongregationType.BRANCH);
    });

    it('sucesso com parentId explícito = id da HQ ativa', async () => {
      const hq = baseCongregation();
      congregationsRepository.findOne.mockResolvedValueOnce(hq); // getActiveHeadquartersOrFail (email/document ausentes no dto)
      const created = baseBranch();
      congregationsRepository.create.mockReturnValue(created);
      congregationsRepository.save.mockResolvedValue(created);

      const result = await service.createBranch({
        name: 'Filial Zona Norte',
        parentId: hq.id,
      });

      expect(result.parentId).toBe(hq.id);
    });

    it('lança 422 CONGREGATIONS_PARENT_NOT_FOUND quando parentId não existe', async () => {
      congregationsRepository.findOne.mockResolvedValue(null);

      await expectApiError(
        service.createBranch({
          name: 'Filial X',
          parentId: '99999999-9999-9999-9999-999999999999',
        }),
        HttpStatus.UNPROCESSABLE_ENTITY,
        ApiErrorCode.CONGREGATIONS_PARENT_NOT_FOUND,
      );
    });

    it('lança 422 CONGREGATIONS_PARENT_MUST_BE_HEADQUARTERS quando parentId é uma filial', async () => {
      const branch = baseBranch();
      congregationsRepository.findOne.mockResolvedValue(branch);

      await expectApiError(
        service.createBranch({ name: 'Filial X', parentId: branch.id }),
        HttpStatus.UNPROCESSABLE_ENTITY,
        ApiErrorCode.CONGREGATIONS_PARENT_MUST_BE_HEADQUARTERS,
      );
    });

    it('lança 409 CONGREGATIONS_EMAIL_IN_USE quando email já pertence a outra congregação', async () => {
      const hq = baseCongregation();
      const other = baseBranch();
      congregationsRepository.findOne
        .mockResolvedValueOnce(hq)
        .mockResolvedValueOnce(other);

      await expectApiError(
        service.createBranch({
          name: 'Filial X',
          parentId: hq.id,
          email: 'existente@aic.org',
        }),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE,
      );
    });

    it('lança 409 CONGREGATIONS_DOCUMENT_IN_USE quando document já pertence a outra congregação', async () => {
      const hq = baseCongregation();
      const other = baseBranch();
      congregationsRepository.findOne
        .mockResolvedValueOnce(hq)
        .mockResolvedValueOnce(other);

      await expectApiError(
        service.createBranch({
          name: 'Filial X',
          parentId: hq.id,
          document: '12.345.678/0002-70',
        }),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE,
      );
    });
  });

  describe('removeNode', () => {
    it('remove filial sem dependentes com sucesso', async () => {
      const branch = baseBranch();
      congregationsRepository.findOne.mockResolvedValue(branch);
      congregationsRepository.softRemove.mockResolvedValue(branch);

      await service.removeNode(branch.id);

      expect(congregationsRepository.softRemove).toHaveBeenCalledWith(branch);
    });

    it('lança 409 CONGREGATIONS_HAS_ACTIVE_BRANCHES ao remover HQ com filial ativa', async () => {
      const hq = baseCongregation();
      congregationsRepository.findOne.mockResolvedValue(hq);
      congregationsRepository.count.mockResolvedValue(1);

      await expectApiError(
        service.removeNode(hq.id),
        HttpStatus.CONFLICT,
        ApiErrorCode.CONGREGATIONS_HAS_ACTIVE_BRANCHES,
      );
      expect(congregationsRepository.softRemove).not.toHaveBeenCalled();
    });

    it('remove HQ com sucesso quando não há filiais ativas', async () => {
      const hq = baseCongregation();
      congregationsRepository.findOne.mockResolvedValue(hq);
      congregationsRepository.count.mockResolvedValue(0);
      congregationsRepository.softRemove.mockResolvedValue(hq);

      await service.removeNode(hq.id);

      expect(congregationsRepository.softRemove).toHaveBeenCalledWith(hq);
    });

    it('lança 404 CONGREGATIONS_NOT_FOUND para id inexistente', async () => {
      congregationsRepository.findOne.mockResolvedValue(null);

      await expectApiError(
        service.removeNode('99999999-9999-9999-9999-999999999999'),
        HttpStatus.NOT_FOUND,
        ApiErrorCode.CONGREGATIONS_NOT_FOUND,
      );
    });
  });
});
