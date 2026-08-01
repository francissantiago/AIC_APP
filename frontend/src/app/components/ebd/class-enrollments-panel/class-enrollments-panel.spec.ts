import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ClassEnrollmentsPanel } from './class-enrollments-panel';

describe('ClassEnrollmentsPanel', () => {
  let component: ClassEnrollmentsPanel;
  let fixture: ComponentFixture<ClassEnrollmentsPanel>;
  const bulkAddEnrollments = vi.fn(() =>
    of({
      created: 1,
      skipped: 0,
      enrollments: [
        {
          classId: 'c1',
          memberId: 'mem1',
          memberFullName: 'Ana',
          status: ClassEnrollmentStatus.ACTIVE,
          enrolledAt: '2026-07-18T00:00:00.000Z',
        },
      ],
    }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    bulkAddEnrollments.mockClear();
    await TestBed.configureTestingModule({
      imports: [ClassEnrollmentsPanel],
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
            listEnrollments: () => of({ data: [], total: 0, page: 1, limit: 100 }),
            bulkAddEnrollments,
            updateEnrollmentStatus: () => of({}),
            removeEnrollment: () => of(undefined),
            enrollmentOptions: () => of([{ id: 'mem1', fullName: 'Ana' }]),
          },
        },
      ],
    })
      .overrideComponent(ClassEnrollmentsPanel, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClassEnrollmentsPanel);
    fixture.componentRef.setInput('classId', 'c1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('enrolls selected members via bulk service', () => {
    component.selectedMemberIds.set(['mem1']);
    component.enrollForm.patchValue({
      status: ClassEnrollmentStatus.ACTIVE,
    });
    component.enrollMembers();
    expect(bulkAddEnrollments).toHaveBeenCalledWith('c1', {
      memberIds: ['mem1'],
      status: ClassEnrollmentStatus.ACTIVE,
    });
  });
});
