import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinancialType, PaymentMethod } from '../finance/enums/finance.enums';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ConstructionExpensesService } from './construction-expenses.service';
import { ConstructionProjectsService } from './construction-projects.service';
import { ConstructionProject } from './entities/construction-project.entity';

describe('ConstructionExpensesService', () => {
  let service: ConstructionExpensesService;

  const projectId = '11111111-2222-3333-4444-555555555555';
  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const categoryId = 'dddddddd-eeee-ffff-0000-111111111111';

  const entriesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };
  const categoriesRepository = {
    findOne: jest.fn(),
  };
  const constructionProjectsService = {
    getCongregationId: jest.fn(),
    getProjectOrFailInternal: jest.fn(),
    syncSpentAmount: jest.fn(),
    checkBudgetAlert: jest.fn(),
  };

  const user = { id: 'user-1' } as UserResponseDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    constructionProjectsService.getCongregationId.mockResolvedValue(
      congregationId,
    );
    constructionProjectsService.getProjectOrFailInternal.mockResolvedValue(
      new ConstructionProject(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructionExpensesService,
        {
          provide: getRepositoryToken(FinancialEntry),
          useValue: entriesRepository,
        },
        {
          provide: getRepositoryToken(FinancialCategory),
          useValue: categoriesRepository,
        },
        {
          provide: ConstructionProjectsService,
          useValue: constructionProjectsService,
        },
      ],
    }).compile();

    service = module.get(ConstructionExpensesService);
  });

  it('cria despesa com categoria Obras e sincroniza spent_amount', async () => {
    const category = {
      id: categoryId,
      name: 'Obras',
      type: FinancialType.EXPENSE,
    };
    categoriesRepository.findOne.mockResolvedValue(category);

    const savedEntry = {
      id: 'entry-1',
      congregationId,
      constructionProjectId: projectId,
      categoryId,
      category,
      type: FinancialType.EXPENSE,
      amount: '150.00',
      entryDate: '2026-07-25',
      description: 'Material',
      paymentMethod: PaymentMethod.PIX,
      reference: `obra:${projectId}`,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    entriesRepository.create.mockReturnValue(savedEntry);
    entriesRepository.save.mockResolvedValue(savedEntry);
    constructionProjectsService.getProjectOrFailInternal.mockResolvedValue(
      new ConstructionProject(),
    );

    const result = await service.create(
      projectId,
      {
        amount: 150,
        entryDate: '2026-07-25',
        description: 'Material',
        paymentMethod: PaymentMethod.PIX,
      },
      user,
      congregationId,
    );

    expect(entriesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        constructionProjectId: projectId,
        type: FinancialType.EXPENSE,
        reference: `obra:${projectId}`,
      }),
    );
    expect(constructionProjectsService.syncSpentAmount).toHaveBeenCalledWith(
      projectId,
    );
    expect(result.amount).toBe('150.00');
  });
});
