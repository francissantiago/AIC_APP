import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinancialType, PaymentMethod } from '../finance/enums/finance.enums';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { SocialProject } from './entities/social-project.entity';
import { SocialProjectExpensesService } from './social-project-expenses.service';
import { SocialProjectsService } from './social-projects.service';

describe('SocialProjectExpensesService', () => {
  let service: SocialProjectExpensesService;

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
  const socialProjectsService = {
    getCongregationId: jest.fn(),
    getProjectOrFailInternal: jest.fn(),
    syncSpentAmount: jest.fn(),
    checkBudgetAlert: jest.fn(),
  };

  const user = { id: 'user-1' } as UserResponseDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    socialProjectsService.getCongregationId.mockResolvedValue(congregationId);
    socialProjectsService.getProjectOrFailInternal.mockResolvedValue(
      new SocialProject(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialProjectExpensesService,
        {
          provide: getRepositoryToken(FinancialEntry),
          useValue: entriesRepository,
        },
        {
          provide: getRepositoryToken(FinancialCategory),
          useValue: categoriesRepository,
        },
        { provide: SocialProjectsService, useValue: socialProjectsService },
      ],
    }).compile();

    service = module.get(SocialProjectExpensesService);
  });

  it('cria despesa com categoria Ação social e sincroniza spent_amount', async () => {
    const category = {
      id: categoryId,
      name: 'Ação social',
      type: FinancialType.EXPENSE,
    };
    categoriesRepository.findOne.mockResolvedValue(category);

    const savedEntry = {
      id: 'entry-1',
      congregationId,
      socialProjectId: projectId,
      categoryId,
      category,
      type: FinancialType.EXPENSE,
      amount: '200.00',
      entryDate: '2026-07-26',
      description: 'Material esportivo',
      paymentMethod: PaymentMethod.PIX,
      reference: `social-project:${projectId}`,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    entriesRepository.create.mockReturnValue(savedEntry);
    entriesRepository.save.mockResolvedValue(savedEntry);
    socialProjectsService.getProjectOrFailInternal.mockResolvedValue(
      new SocialProject(),
    );

    const result = await service.create(
      projectId,
      {
        amount: 200,
        entryDate: '2026-07-26',
        description: 'Material esportivo',
        paymentMethod: PaymentMethod.PIX,
      },
      user,
      congregationId,
    );

    expect(entriesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        socialProjectId: projectId,
        type: FinancialType.EXPENSE,
        reference: `social-project:${projectId}`,
      }),
    );
    expect(socialProjectsService.syncSpentAmount).toHaveBeenCalledWith(
      projectId,
    );
    expect(result.amount).toBe('200.00');
  });
});
