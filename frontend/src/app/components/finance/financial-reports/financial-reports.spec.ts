import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { FinanceService } from '@services/finance-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { FinancialReports } from './financial-reports';

describe('FinancialReports', () => {
  let component: FinancialReports;
  let fixture: ComponentFixture<FinancialReports>;
  const memberContributions = vi.fn(() =>
    of({
      member: { id: 'm1', fullName: 'Ana' },
      period: { from: '2026-01-01', to: '2026-12-31' },
      summary: {
        total: '150.00',
        tithesTotal: '100.00',
        offeringsTotal: '50.00',
        donationsTotal: '0.00',
        entriesCount: 2,
      },
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
  );
  const memberContributionsCsv = vi.fn(() => of(new Blob(['csv'])));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    memberContributions.mockClear();
    memberContributionsCsv.mockClear();
    await TestBed.configureTestingModule({
      imports: [FinancialReports],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: FinanceService,
          useValue: {
            categories: () => of([]),
            memberOptions: () => of([{ id: 'm1', fullName: 'Ana' }]),
            cashFlowReport: () =>
              of({
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                summary: { income: '0', expense: '0', balance: '0' },
              }),
            assetReport: () =>
              of({ data: [], total: 0, page: 1, limit: 20, quantity: 0, estimatedValue: '0' }),
            cashFlowCsv: () => of(new Blob(['csv'])),
            memberContributions,
            memberContributionsCsv,
          },
        },
        { provide: DOCUMENT, useValue: document },
      ],
    })
      .overrideComponent(FinancialReports, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FinancialReports);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('switches to contributions tab', () => {
    component.selectTab('contributions');
    expect(component.tab()).toBe('contributions');
  });

  it('loads member contributions when filters are valid', () => {
    component.selectTab('contributions');
    component.contributionsForm.setValue({
      memberId: 'm1',
      memberQuery: '',
      from: '2026-01-01',
      to: '2026-12-31',
    });
    component.applyContributionsFilters();
    expect(memberContributions).toHaveBeenCalledWith({
      memberId: 'm1',
      from: '2026-01-01',
      to: '2026-12-31',
      page: 1,
      limit: 20,
    });
    expect(component.contributions()?.summary.total).toBe('150.00');
  });

  it('exports member contributions csv', () => {
    component.contributionsForm.setValue({
      memberId: 'm1',
      memberQuery: '',
      from: '2026-01-01',
      to: '2026-12-31',
    });
    component.exportMemberCsv();
    expect(memberContributionsCsv).toHaveBeenCalledWith({
      memberId: 'm1',
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });
});
