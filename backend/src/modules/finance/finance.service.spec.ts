import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AssetsService } from '../assets/assets.service';
import { CongregationsService } from '../congregations/congregations.service';
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
  const categoriesRepository = {
    findOne: categoryFindOne,
    find: categoryFind,
    save: categorySave,
    create: jest.fn((value: object) => value),
  } as unknown as Repository<FinancialCategory>;
  const entriesRepository = {
    findOne: entryFindOne,
  } as unknown as Repository<FinancialEntry>;
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
    congregationsService,
    assetsService,
  );

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
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
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
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('isola busca de lançamento pela congregação-base', async () => {
    entryFindOne.mockResolvedValue(null);

    await expect(service.findEntry('entry-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(entryFindOne).toHaveBeenCalledWith({
      where: { id: 'entry-1', congregationId: 'congregation-1' },
      relations: { category: true },
    });
  });

  it('exige período no CSV', async () => {
    await expect(service.exportCashFlowCsv({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejeita período invertido e superior a 24 meses', () => {
    expect(() => service['validatePeriod']('2026-08-01', '2026-07-01')).toThrow(
      BadRequestException,
    );
    expect(() => service['validatePeriod']('2024-01-01', '2026-02-01')).toThrow(
      BadRequestException,
    );
  });

  it('calcula valores monetários sem aritmética de ponto flutuante', () => {
    expect(service['subtractMoney']('99999999999.99', '0.01')).toBe(
      '99999999999.98',
    );
    expect(service['money'](10.1)).toBe('10.10');
  });
});
