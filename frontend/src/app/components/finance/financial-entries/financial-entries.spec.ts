import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { FinanceService } from '@services/finance-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { FinancialEntries } from './financial-entries';

describe('FinancialEntries', () => {
  let component: FinancialEntries;
  let fixture: ComponentFixture<FinancialEntries>;
  const entries = vi.fn(() => of({ data: [], total: 0, page: 1, limit: 20 }));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    entries.mockClear();
    await TestBed.configureTestingModule({
      imports: [FinancialEntries],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: ['finance:read', 'finance:write'] }),
            hasPermission: (code: string) => ['finance:read', 'finance:write'].includes(code),
          },
        },
        {
          provide: FinanceService,
          useValue: {
            entries,
            categories: () => of([]),
            memberOptions: () => of([{ id: 'm1', fullName: 'Ana' }]),
            removeEntry: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(FinancialEntries, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FinancialEntries);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters entries by memberId', () => {
    component.filterForm.patchValue({ memberId: 'm1' });
    component.applyFilters();
    expect(entries).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm1',
        page: 1,
        limit: 20,
      }),
    );
  });
});
