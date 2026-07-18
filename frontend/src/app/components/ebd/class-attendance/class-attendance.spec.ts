import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ClassAttendance } from './class-attendance';

describe('ClassAttendance', () => {
  let component: ClassAttendance;
  let fixture: ComponentFixture<ClassAttendance>;
  const getSessionAttendance = vi.fn(() =>
    of({
      classId: 'c1',
      className: 'Classe de Jovens',
      sessionDate: '2026-07-13',
      entries: [
        {
          memberId: 'm1',
          memberFullName: 'Ana',
          enrollmentStatus: ClassEnrollmentStatus.ACTIVE,
          attendanceId: null,
          present: null,
          notes: null,
        },
      ],
    }),
  );
  const saveSessionAttendance = vi.fn(() =>
    of({
      classId: 'c1',
      className: 'Classe de Jovens',
      sessionDate: '2026-07-13',
      entries: [
        {
          memberId: 'm1',
          memberFullName: 'Ana',
          enrollmentStatus: ClassEnrollmentStatus.ACTIVE,
          attendanceId: 'a1',
          present: true,
          notes: null,
        },
      ],
    }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    getSessionAttendance.mockClear();
    saveSessionAttendance.mockClear();
    await TestBed.configureTestingModule({
      imports: [ClassAttendance],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              permissions: ['classes:write', 'classes:read'],
            }),
            hasPermission: (code: string) => ['classes:write', 'classes:read'].includes(code),
          },
        },
        {
          provide: ClassesService,
          useValue: {
            getSessionAttendance,
            saveSessionAttendance,
          },
        },
      ],
    })
      .overrideComponent(ClassAttendance, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClassAttendance);
    fixture.componentRef.setInput('classId', 'c1');
    fixture.componentRef.setInput('sessionDate', '2026-07-13');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads session sheet into drafts', () => {
    expect(getSessionAttendance).toHaveBeenCalledWith('c1', '2026-07-13');
    expect(component.drafts().length).toBe(1);
    expect(component.drafts()[0]?.memberFullName).toBe('Ana');
  });

  it('saves batch attendance for all drafts', () => {
    component.setPresent('m1', true);
    component.save();
    expect(saveSessionAttendance).toHaveBeenCalledWith('c1', {
      sessionDate: '2026-07-13',
      entries: [{ memberId: 'm1', present: true, notes: null }],
    });
  });
});
