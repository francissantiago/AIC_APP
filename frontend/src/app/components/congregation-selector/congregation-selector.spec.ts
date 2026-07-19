import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { CongregationType } from '@enums/congregation-type';
import { CongregationContextService } from '@services/congregation-context-service';
import { translateServiceStub } from '../../testing/translate-testing';
import { CongregationSelector } from './congregation-selector';

describe('CongregationSelector', () => {
  let component: CongregationSelector;
  let fixture: ComponentFixture<CongregationSelector>;
  let context: {
    selectorVisible: ReturnType<typeof signal<boolean>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<boolean>>;
    memberships: ReturnType<typeof signal<unknown[]>>;
    activeCongregationId: ReturnType<typeof signal<string | null>>;
    contextDeniedMessage: ReturnType<typeof signal<boolean>>;
    switchActiveCongregation: ReturnType<typeof vi.fn>;
    clearContextDeniedMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    context = {
      selectorVisible: signal(false),
      loading: signal(false),
      error: signal(false),
      memberships: signal([]),
      activeCongregationId: signal(null),
      contextDeniedMessage: signal(false),
      switchActiveCongregation: vi.fn(),
      clearContextDeniedMessage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CongregationSelector],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: CongregationContextService, useValue: context },
      ],
    })
      .overrideComponent(CongregationSelector, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CongregationSelector);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('is hidden when selectorVisible is false', () => {
    context.selectorVisible.set(false);
    fixture.detectChanges();
    expect(component.selectorVisible()).toBe(false);
  });

  it('calls switchActiveCongregation on change', () => {
    context.selectorVisible.set(true);
    context.activeCongregationId.set('11111111-1111-1111-1111-111111111111');
    context.memberships.set([
      {
        congregationId: '11111111-1111-1111-1111-111111111111',
        congregationName: 'Matriz',
        congregationType: CongregationType.HEADQUARTERS,
        isDefault: true,
        assignedAt: '',
      },
      {
        congregationId: '22222222-2222-2222-2222-222222222222',
        congregationName: 'Filial',
        congregationType: CongregationType.BRANCH,
        isDefault: false,
        assignedAt: '',
      },
    ]);

    component.onCongregationChange({
      target: { value: '22222222-2222-2222-2222-222222222222' },
    } as unknown as Event);

    expect(context.switchActiveCongregation).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
    );
    expect(component.switchedFeedback()).toBe(true);
  });
});
