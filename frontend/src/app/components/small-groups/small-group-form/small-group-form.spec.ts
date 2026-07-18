import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { SmallGroupsService } from '@services/small-groups-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SmallGroupForm } from './small-group-form';

describe('SmallGroupForm', () => {
  let component: SmallGroupForm;
  let fixture: ComponentFixture<SmallGroupForm>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: SmallGroupsService,
          useValue: {
            leaderOptions: () => of([]),
            getById: () => of(null),
            create: () => of({}),
            update: () => of({}),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: null, supportHint: null }) },
        },
      ],
    })
      .overrideComponent(SmallGroupForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groupId', null);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in create mode when groupId is null', () => {
    expect(component.isEditMode()).toBe(false);
  });
});
