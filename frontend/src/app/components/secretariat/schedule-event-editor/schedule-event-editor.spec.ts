import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { MinistriesService } from '@services/ministries-service';
import { SchedulesService } from '@services/schedules-service';
import { SecretariatService } from '@services/secretariat-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ScheduleEventEditor } from './schedule-event-editor';

describe('ScheduleEventEditor', () => {
  let component: ScheduleEventEditor;
  let fixture: ComponentFixture<ScheduleEventEditor>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ScheduleEventEditor],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: SchedulesService,
          useValue: {
            listEventAssignments: () => of([]),
            memberOptions: () => of([]),
            bulkUpsertAssignments: () => of([]),
          },
        },
        {
          provide: MinistriesService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 100 }),
          },
        },
        {
          provide: SecretariatService,
          useValue: {
            calendarEvents: () => of({ data: [], total: 0, page: 1, limit: 100 }),
          },
        },
        {
          provide: ApiErrorService,
          useValue: {
            resolve: () => ({ statusCode: 0, displayMessage: 'error', details: [] }),
          },
        },
      ],
    })
      .overrideComponent(ScheduleEventEditor, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ScheduleEventEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('canWrite', false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not submit when canWrite is false', () => {
    component.submit();
    expect(component.saving()).toBe(false);
  });

  it('adds a row when canWrite is true', () => {
    fixture.componentRef.setInput('canWrite', true);
    fixture.detectChanges();
    const before = component.rows.length;
    component.addRow();
    expect(component.rows.length).toBe(before + 1);
  });
});
