import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialType, PaymentMethod } from '@enums/finance';
import { IFinancialCategory } from '@interfaces/IFinance';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { FinanceService } from '@services/finance-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { FinancialEntryForm } from './financial-entry-form';

describe('FinancialEntryForm', () => {
  let component: FinancialEntryForm;
  let fixture: ComponentFixture<FinancialEntryForm>;
  const createEntry = vi.fn(() => of({}));

  const categories: IFinancialCategory[] = [
    {
      id: 'cat-tithe',
      name: 'Dízimos',
      type: FinancialType.INCOME,
      active: true,
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-donation',
      name: 'Doações',
      type: FinancialType.INCOME,
      active: true,
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-others',
      name: 'Outros',
      type: FinancialType.INCOME,
      active: true,
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-expense',
      name: 'Despesas',
      type: FinancialType.EXPENSE,
      active: true,
      isDefault: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    createEntry.mockClear();
    await TestBed.configureTestingModule({
      imports: [FinancialEntryForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: FinanceService,
          useValue: {
            memberOptions: () => of([{ id: 'm1', fullName: 'Ana' }]),
            createEntry,
            updateEntry: () => of({}),
            loading: signal(false),
            error: signal(null),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error', supportHint: null }) },
        },
      ],
    })
      .overrideComponent(FinancialEntryForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FinancialEntryForm);
    fixture.componentRef.setInput('categories', categories);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows member field for income tithes/offerings/donations', () => {
    expect(component.isMemberLinkable(FinancialType.INCOME, 'cat-tithe')).toBe(true);
    expect(component.isMemberLinkable(FinancialType.INCOME, 'cat-donation')).toBe(true);
    expect(component.isMemberLinkable(FinancialType.INCOME, 'cat-others')).toBe(false);
    expect(component.isMemberLinkable(FinancialType.EXPENSE, 'cat-expense')).toBe(false);
  });

  it('clears memberId when category leaves linkable set', () => {
    component.form.patchValue({
      type: FinancialType.INCOME,
      categoryId: 'cat-tithe',
      memberId: 'm1',
    });
    expect(component.showMemberField()).toBe(true);

    component.form.controls.categoryId.setValue('cat-others');
    expect(component.showMemberField()).toBe(false);
    expect(component.form.controls.memberId.value).toBe('');
  });

  it('includes memberId in create payload when linkable', () => {
    component.form.setValue({
      entryDate: '2026-07-18',
      type: FinancialType.INCOME,
      categoryId: 'cat-tithe',
      description: 'Dízimo',
      amount: 100,
      paymentMethod: PaymentMethod.PIX,
      reference: '',
      notes: '',
      memberId: 'm1',
      memberQuery: '',
    });
    component.showMemberField.set(true);
    component.submit();

    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm1',
        categoryId: 'cat-tithe',
      }),
    );
  });
});
