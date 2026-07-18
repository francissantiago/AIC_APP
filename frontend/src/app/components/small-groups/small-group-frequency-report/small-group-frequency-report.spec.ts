import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { SmallGroupsService } from '@services/small-groups-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SmallGroupFrequencyReport } from './small-group-frequency-report';

describe('SmallGroupFrequencyReport', () => {
  let component: SmallGroupFrequencyReport;
  let fixture: ComponentFixture<SmallGroupFrequencyReport>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupFrequencyReport],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: DOCUMENT, useValue: document },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
        {
          provide: SmallGroupsService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            frequencyReport: () => of(null),
            frequencyCsv: () => of(new Blob()),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: null }) },
        },
      ],
    })
      .overrideComponent(SmallGroupFrequencyReport, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupFrequencyReport);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
