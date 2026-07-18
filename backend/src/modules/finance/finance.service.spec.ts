import { HttpStatus } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { AssetsService } from '../assets/assets.service';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { FinancialCategory } from './entities/financial-category.entity';
import { FinancialEntry } from './entities/financial-entry.entity';
import { FinanceService } from './finance.service';
import { FinancialType, PaymentMethod } from './enums/finance.enums';

describe('FinanceService', () => {
  const categoryFindOne = jest.fn();
  const categoryFind = jest.fn().mockResolvedValue([]);
  const categorySave = jest.fn().mockResolvedValue([]);
  const entryFindOne = jest.fn();
  const entrySave = jest.fn();
  const entryCreate = jest.fn((value: object) => value);
  const memberFindOne = jest.fn();
  const createQueryBuilder = jest.fn();

  const categoriesRepository = {
    findOne: categoryFindOne,
    find: categoryFind,
    save: categorySave,
    create: jest.fn((value: object) => value),
  } as unknown as Repository<FinancialCategory>;

  const entriesRepository = {
    findOne: entryFindOne,
    save: entrySave,
    create: entryCreate,
    createQueryBuilder,
  } as unknown as Repository<FinancialEntry>;

  const membersRepository = {
    findOne: memberFindOne,
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<Member>;

  const congregationsService = {
    getOrCreateBase: jest.fn().mockResolvedValue({ id: 'congregation-1' }),
  } as unknown as CongregationsService;

  const assetsService = {
    getDashboardTotals: jest.fn().mockResolvedValue({
      activeAssets: 0,
      estimatedAssetValue: '0.00',
    }),
  } as unknown as AssetsService;

  const service = new FinanceService(
    categoriesRepository,
    entriesRepository,
    membersRepository,
    congregationsService,
    assetsService,
  );

  const tithesCategory = Object.assign(new FinancialCategory(), {
    id: 'category-tithes',
    congregationId: 'congregation-1',
    name: 'Dízimos',
    type: FinancialType.INCOME,
    active: true,
    isDefault: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const donationsCategory = Object.assign(new FinancialCategory(), {
    id: 'category-donations',
    congregationId: 'congregation-1',
    name: 'Doações',
    type: FinancialType.INCOME,
    active: true,
    isDefault: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const expenseCategory = Object.assign(new FinancialCategory(), {
    id: 'category-expense',
    congregationId: 'congregation-1',
    name: 'Água',
    type: FinancialType.EXPENSE,
    active: true,
    isDefault: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const activeMember = Object.assign(new Member(), {
    id: 'member-1',
    fullName: 'João Silva',
    congregationId: 'congregation-1',
  });

  beforeEach(() => jest.clearAllMocks());

  it('rejeita categoria inativa em novo lançamento', async () => {
    categoryFindOne.mockResolvedValue(
      Object.assign(new FinancialCategory(), {
        id: 'category-1',
        congregationId: 'congregation-1',
        type: FinancialType.INCOME,
        active: false,
      }),
    );

    await expect(
      service.createEntry(
        {
          categoryId: 'category-1',
          type: FinancialType.INCOME,
          amount: 10,
          entryDate: '2026-07-17',
          description: 'Oferta',
          paymentMethod: PaymentMethod.PIX,
        },
        { id: 'user-1' } as UserResponseDto,
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('rejeita tipo incompatível com a categoria', async () => {
    categoryFindOne.mockResolvedValue(
      Object.assign(new FinancialCategory(), {
        id: 'category-1',
        congregationId: 'congregation-1',
        type: FinancialType.EXPENSE,
        active: true,
      }),
    );

    await expect(
      service.createEntry(
        {
          categoryId: 'category-1',
          type: FinancialType.INCOME,
          amount: 10,
          entryDate: '2026-07-17',
          description: 'Oferta',
          paymentMethod: PaymentMethod.PIX,
        },
        { id: 'user-1' } as UserResponseDto,
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('isola busca de lançamento pela congregação-base', async () => {
    entryFindOne.mockResolvedValue(null);

    await expect(service.findEntry('entry-1')).rejects.toBeInstanceOf(
      ApiException,
    );
    expect(entryFindOne).toHaveBeenCalledWith({
      where: { id: 'entry-1', congregationId: 'congregation-1' },
      relations: { category: true, member: true },
    });
  });

  it('exige período no CSV', async () => {
    await expect(service.exportCashFlowCsv({})).rejects.toBeInstanceOf(
      ApiException,
    );
  });

  it('rejeita período invertido e superior a 24 meses', () => {
    expect(() => service['validatePeriod']('2026-08-01', '2026-07-01')).toThrow(
      ApiException,
    );
    expect(() => service['validatePeriod']('2024-01-01', '2026-02-01')).toThrow(
      ApiException,
    );
  });

  it('calcula valores monetários sem aritmética de ponto flutuante', () => {
    expect(service['subtractMoney']('99999999999.99', '0.01')).toBe(
      '99999999999.98',
    );
    expect(service['money'](10.1)).toBe('10.10');
  });

  describe('vínculo memberId (R1–R5)', () => {
    it('R1: cria dízimo anônimo sem memberId', async () => {
      categoryFindOne.mockResolvedValue(tithesCategory);
      entrySave.mockImplementation((entry: FinancialEntry) =>
        Promise.resolve(
          Object.assign(new FinancialEntry(), entry, {
            id: 'entry-1',
            createdAt: new Date('2026-07-17'),
            updatedAt: new Date('2026-07-17'),
          }),
        ),
      );

      const result = await service.createEntry(
        {
          categoryId: tithesCategory.id,
          type: FinancialType.INCOME,
          amount: 100,
          entryDate: '2026-07-17',
          description: 'Dízimo anônimo',
          paymentMethod: PaymentMethod.CASH,
        },
        { id: 'user-1' } as UserResponseDto,
      );

      expect(result.memberId).toBeNull();
      expect(result.member).toBeNull();
      expect(memberFindOne).not.toHaveBeenCalled();
    });

    it('R1/R3: cria dízimo com memberId válido', async () => {
      categoryFindOne.mockResolvedValue(tithesCategory);
      memberFindOne.mockResolvedValue(activeMember);
      entrySave.mockImplementation((entry: FinancialEntry) =>
        Promise.resolve(
          Object.assign(new FinancialEntry(), entry, {
            id: 'entry-2',
            createdAt: new Date('2026-07-17'),
            updatedAt: new Date('2026-07-17'),
          }),
        ),
      );

      const result = await service.createEntry(
        {
          categoryId: tithesCategory.id,
          type: FinancialType.INCOME,
          amount: 200,
          entryDate: '2026-07-17',
          description: 'Dízimo nominal',
          paymentMethod: PaymentMethod.PIX,
          memberId: activeMember.id,
        },
        { id: 'user-1' } as UserResponseDto,
      );

      expect(result.memberId).toBe(activeMember.id);
      expect(result.member).toEqual({
        id: activeMember.id,
        fullName: activeMember.fullName,
      });
    });

    it('R3: cria doação com memberId válido', async () => {
      categoryFindOne.mockResolvedValue(donationsCategory);
      memberFindOne.mockResolvedValue(activeMember);
      entrySave.mockImplementation((entry: FinancialEntry) =>
        Promise.resolve(
          Object.assign(new FinancialEntry(), entry, {
            id: 'entry-donation',
            createdAt: new Date('2026-07-17'),
            updatedAt: new Date('2026-07-17'),
          }),
        ),
      );

      const result = await service.createEntry(
        {
          categoryId: donationsCategory.id,
          type: FinancialType.INCOME,
          amount: 50,
          entryDate: '2026-07-17',
          description: 'Doação nominal',
          paymentMethod: PaymentMethod.PIX,
          memberId: activeMember.id,
        },
        { id: 'user-1' } as UserResponseDto,
      );

      expect(result.memberId).toBe(activeMember.id);
      expect(result.member).toEqual({
        id: activeMember.id,
        fullName: activeMember.fullName,
      });
    });

    it('R3: rejeita memberId com categoria Outros', async () => {
      const othersCategory = Object.assign(new FinancialCategory(), {
        ...donationsCategory,
        id: 'category-others',
        name: 'Outros',
      });
      categoryFindOne.mockResolvedValue(othersCategory);

      await expect(
        service.createEntry(
          {
            categoryId: othersCategory.id,
            type: FinancialType.INCOME,
            amount: 50,
            entryDate: '2026-07-17',
            description: 'Outro',
            paymentMethod: PaymentMethod.PIX,
            memberId: activeMember.id,
          },
          { id: 'user-1' } as UserResponseDto,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.FINANCE_MEMBER_LINK_INVALID },
      });
    });

    it('R2: rejeita memberId com type=expense', async () => {
      categoryFindOne.mockResolvedValue(expenseCategory);

      await expect(
        service.createEntry(
          {
            categoryId: expenseCategory.id,
            type: FinancialType.EXPENSE,
            amount: 50,
            entryDate: '2026-07-17',
            description: 'Conta',
            paymentMethod: PaymentMethod.OTHER,
            memberId: activeMember.id,
          },
          { id: 'user-1' } as UserResponseDto,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.FINANCE_MEMBER_LINK_INVALID },
      });
    });

    it('R4: rejeita membro inexistente', async () => {
      categoryFindOne.mockResolvedValue(tithesCategory);
      memberFindOne.mockResolvedValue(null);

      await expect(
        service.createEntry(
          {
            categoryId: tithesCategory.id,
            type: FinancialType.INCOME,
            amount: 100,
            entryDate: '2026-07-17',
            description: 'Dízimo',
            paymentMethod: PaymentMethod.PIX,
            memberId: 'missing-member',
          },
          { id: 'user-1' } as UserResponseDto,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ApiErrorCode.FINANCE_MEMBER_NOT_FOUND },
      });
    });

    it('R4: rejeita membro de outra congregação', async () => {
      categoryFindOne.mockResolvedValue(tithesCategory);
      memberFindOne.mockResolvedValue(
        Object.assign(new Member(), {
          id: 'member-2',
          fullName: 'Outro',
          congregationId: 'congregation-2',
        }),
      );

      await expect(
        service.createEntry(
          {
            categoryId: tithesCategory.id,
            type: FinancialType.INCOME,
            amount: 100,
            entryDate: '2026-07-17',
            description: 'Dízimo',
            paymentMethod: PaymentMethod.PIX,
            memberId: 'member-2',
          },
          { id: 'user-1' } as UserResponseDto,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION },
      });
    });

    it('R5: update com memberId null desvincula', async () => {
      const entry = Object.assign(new FinancialEntry(), {
        id: 'entry-3',
        congregationId: 'congregation-1',
        categoryId: tithesCategory.id,
        category: tithesCategory,
        memberId: activeMember.id,
        member: activeMember,
        type: FinancialType.INCOME,
        amount: '100.00',
        entryDate: '2026-07-17',
        description: 'Dízimo',
        paymentMethod: PaymentMethod.PIX,
        reference: null,
        notes: null,
        createdByUserId: 'user-1',
        createdAt: new Date('2026-07-17'),
        updatedAt: new Date('2026-07-17'),
      });
      entryFindOne.mockResolvedValue(entry);
      entrySave.mockImplementation((value: FinancialEntry) =>
        Promise.resolve(value),
      );

      const result = await service.updateEntry('entry-3', { memberId: null });

      expect(result.memberId).toBeNull();
      expect(result.member).toBeNull();
    });

    it('R5: rejeita manter memberId ao trocar para Outros', async () => {
      const othersCategory = Object.assign(new FinancialCategory(), {
        ...donationsCategory,
        id: 'category-others',
        name: 'Outros',
      });
      const entry = Object.assign(new FinancialEntry(), {
        id: 'entry-4',
        congregationId: 'congregation-1',
        categoryId: tithesCategory.id,
        category: tithesCategory,
        memberId: activeMember.id,
        member: activeMember,
        type: FinancialType.INCOME,
        amount: '100.00',
        entryDate: '2026-07-17',
        description: 'Dízimo',
        paymentMethod: PaymentMethod.PIX,
        reference: null,
        notes: null,
        createdByUserId: 'user-1',
        createdAt: new Date('2026-07-17'),
        updatedAt: new Date('2026-07-17'),
      });
      entryFindOne.mockResolvedValue(entry);
      categoryFindOne.mockResolvedValue(othersCategory);
      memberFindOne.mockResolvedValue(activeMember);

      await expect(
        service.updateEntry('entry-4', {
          categoryId: othersCategory.id,
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.FINANCE_MEMBER_LINK_INVALID },
      });
    });
  });

  describe('listagem e relatório (R7)', () => {
    it('aplica filtro memberId na listagem', () => {
      const andWhere = jest.fn().mockReturnThis();
      const qb = {
        andWhere,
      } as unknown as SelectQueryBuilder<FinancialEntry>;

      service['applyEntryFilters'](qb, { memberId: 'member-1' });

      expect(andWhere).toHaveBeenCalledWith('entry.memberId = :memberId', {
        memberId: 'member-1',
      });
    });

    it('relatório agrega tithes e offerings', async () => {
      memberFindOne.mockResolvedValue(activeMember);
      const offeringsCategory = Object.assign(new FinancialCategory(), {
        ...tithesCategory,
        id: 'category-offerings',
        name: 'Ofertas',
      });
      const entries = [
        Object.assign(new FinancialEntry(), {
          id: 'e1',
          entryDate: '2026-07-01',
          description: 'Dízimo',
          amount: '100.00',
          paymentMethod: PaymentMethod.PIX,
          category: tithesCategory,
        }),
        Object.assign(new FinancialEntry(), {
          id: 'e2',
          entryDate: '2026-07-02',
          description: 'Oferta',
          amount: '50.00',
          paymentMethod: PaymentMethod.CASH,
          category: offeringsCategory,
        }),
      ];

      const clone = jest.fn();
      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '150.00',
          tithesTotal: '100.00',
          offeringsTotal: '50.00',
          donationsTotal: '0.00',
          entriesCount: '2',
        }),
      };
      const pageQb = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([entries, 2]),
      };
      clone.mockReturnValueOnce(totalsQb).mockReturnValueOnce(pageQb);

      const baseQb = {
        clone,
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
      };
      createQueryBuilder.mockReturnValue(baseQb);

      const report = await service.getMemberContributions({
        memberId: activeMember.id,
        from: '2026-07-01',
        to: '2026-07-31',
        page: 1,
        limit: 20,
      });

      expect(report.summary.total).toBe('150.00');
      expect(report.summary.tithesTotal).toBe('100.00');
      expect(report.summary.offeringsTotal).toBe('50.00');
      expect(report.summary.donationsTotal).toBe('0.00');
      expect(report.summary.entriesCount).toBe(2);
      expect(report.data).toHaveLength(2);
      expect(report.member.fullName).toBe('João Silva');
    });

    it('CSV de contribuições retorna BOM e header', async () => {
      memberFindOne.mockResolvedValue(activeMember);
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          Object.assign(new FinancialEntry(), {
            entryDate: '2026-07-01',
            category: tithesCategory,
            description: 'Dízimo',
            amount: '100.00',
            paymentMethod: PaymentMethod.PIX,
            reference: null,
          }),
        ]),
      };
      createQueryBuilder.mockReturnValue(qb);

      const csv = await service.exportMemberContributionsCsv({
        memberId: activeMember.id,
        from: '2026-07-01',
        to: '2026-07-31',
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain(
        '"Data";"Categoria";"Descrição";"Valor";"Meio de pagamento";"Referência";"Membro"',
      );
      expect(csv).toContain('João Silva');
    });

    it('member-options filtra congregação, ativos e limit', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([activeMember]),
      };
      (membersRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const options = await service.listMemberOptions({ q: 'Jo', limit: 10 });

      expect(qb.where).toHaveBeenCalledWith(
        'member.congregationId = :congregationId',
        { congregationId: 'congregation-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('member.status = :status', {
        status: 'active',
      });
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(options).toEqual([
        { id: activeMember.id, fullName: activeMember.fullName },
      ]);
    });
  });
});
