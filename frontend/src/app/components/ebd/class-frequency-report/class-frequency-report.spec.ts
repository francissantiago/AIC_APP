import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ClassesService } from '@services/classes-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ClassFrequencyReport } from './class-frequency-report';

describe('ClassFrequencyReport', () => {
  let component: ClassFrequencyReport;
  let fixture: ComponentFixture<ClassFrequencyReport>;
  const frequencyReport = vi.fn(() =>
    of({
      classId: 'c1',
      className: 'Classe de Jovens',
      from: '2026-01-01',
      to: '2026-07-18',
      sessionsCount: 2,
      members: [
        {
          memberId: 'm1',
          memberFullName: 'Ana',
          presentCount: 1,
          absentCount: 1,
          frequencyPct: 50,
        },
      ],
      classAveragePct: 50,
    }),
  );
  const frequencyCsv = vi.fn(() => of(new Blob(['csv'], { type: 'text/csv' })));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    frequencyReport.mockClear();
    frequencyCsv.mockClear();
    await TestBed.configureTestingModule({
      imports: [ClassFrequencyReport],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: DOCUMENT, useValue: document },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'classId' ? 'c1' : null),
              },
            },
          },
        },
        {
          provide: ClassesService,
          useValue: {
            list: () =>
              of({
                data: [
                  {
                    id: 'c1',
                    congregationId: 'cong1',
                    name: 'Classe de Jovens',
                    description: null,
                    ageGroup: 'youth',
                    teacherMemberId: null,
                    teacher: null,
                    dayOfWeek: 0,
                    startTime: '09:00:00',
                    room: null,
                    status: 'active',
                    createdAt: '',
                    updatedAt: '',
                  },
                ],
                total: 1,
                page: 1,
                limit: 100,
              }),
            frequencyReport,
            frequencyCsv,
          },
        },
      ],
    })
      .overrideComponent(ClassFrequencyReport, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClassFrequencyReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('preselects classId from query params', () => {
    expect(component.filterForm.controls.classId.value).toBe('c1');
  });

  it('loads frequency report', () => {
    component.filterForm.patchValue({
      classId: 'c1',
      from: '2026-01-01',
      to: '2026-07-18',
    });
    component.loadReport();
    expect(frequencyReport).toHaveBeenCalledWith('c1', {
      from: '2026-01-01',
      to: '2026-07-18',
    });
    expect(component.report()?.classAveragePct).toBe(50);
  });
});
