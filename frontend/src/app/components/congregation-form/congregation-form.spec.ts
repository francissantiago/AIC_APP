import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';
import { CongregationService } from '@services/congregation-service';
import { translateServiceStub } from '../../testing/translate-testing';
import { CongregationForm } from './congregation-form';

describe('CongregationForm', () => {
  let component: CongregationForm;
  let fixture: ComponentFixture<CongregationForm>;
  let congregationService: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    congregationService = {
      get: vi.fn().mockReturnValue(
        of({
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          name: 'Congregação',
          tradeName: null,
          type: CongregationType.HEADQUARTERS,
          document: null,
          email: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          foundationDate: null,
          website: null,
          status: CongregationStatus.ACTIVE,
          notes: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
      update: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [CongregationForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: CongregationService, useValue: congregationService },
      ],
    })
      .overrideComponent(CongregationForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CongregationForm);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load congregation on init', () => {
    component.ngOnInit();
    expect(congregationService.get).toHaveBeenCalledTimes(1);
    expect(component.form.controls.name.value).toBe('Congregação');
    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(false);
  });

  it('should PATCH on submit when form is valid', () => {
    component.ngOnInit();
    component.form.patchValue({ name: 'Congregação Central', email: 'contato@aic.org' });
    congregationService.update.mockReturnValue(
      of({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        name: 'Congregação Central',
        tradeName: null,
        type: CongregationType.HEADQUARTERS,
        document: null,
        email: 'contato@aic.org',
        phone: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        foundationDate: null,
        website: null,
        status: CongregationStatus.ACTIVE,
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    component.submit();

    expect(congregationService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Congregação Central',
        email: 'contato@aic.org',
      }),
    );
    expect(component.feedbackKey()).toBe('CONGREGATION.SAVE_SUCCESS');
  });
});
