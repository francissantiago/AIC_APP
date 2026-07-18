import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { of } from 'rxjs';
import { ClassesService } from './classes-service';

describe('ClassesService', () => {
  let service: ClassesService;
  let getUrl = '';
  let getOptions: unknown;
  let postUrl = '';
  let putUrl = '';
  let putBody: unknown;
  let patchUrl = '';
  let deleteUrl = '';

  beforeEach(() => {
    TestBed.resetTestingModule();
    getUrl = '';
    getOptions = undefined;
    postUrl = '';
    putUrl = '';
    putBody = undefined;
    patchUrl = '';
    deleteUrl = '';
    TestBed.configureTestingModule({
      providers: [
        ClassesService,
        {
          provide: HttpClient,
          useValue: {
            get: (url: string, options?: unknown) => {
              getUrl = url;
              getOptions = options;
              return of({ data: [], total: 0, page: 1, limit: 20 });
            },
            post: (url: string) => {
              postUrl = url;
              return of({});
            },
            put: (url: string, body: unknown) => {
              putUrl = url;
              putBody = body;
              return of({});
            },
            patch: (url: string) => {
              patchUrl = url;
              return of({});
            },
            delete: (url: string) => {
              deleteUrl = url;
              return of(undefined);
            },
          },
        },
      ],
    });
    service = TestBed.inject(ClassesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listEnrollments calls enrollments endpoint', () => {
    service.listEnrollments('c1', { page: 1, limit: 20, status: ClassEnrollmentStatus.ACTIVE });
    expect(getUrl).toContain('/classes/c1/enrollments');
  });

  it('addEnrollment posts enrollment body', () => {
    service.addEnrollment('c1', { memberId: 'm1' });
    expect(postUrl).toContain('/classes/c1/enrollments');
  });

  it('updateEnrollmentStatus patches status', () => {
    service.updateEnrollmentStatus('c1', 'm1', { status: ClassEnrollmentStatus.INACTIVE });
    expect(patchUrl).toContain('/classes/c1/enrollments/m1');
  });

  it('removeEnrollment deletes enrollment', () => {
    service.removeEnrollment('c1', 'm1');
    expect(deleteUrl).toContain('/classes/c1/enrollments/m1');
  });

  it('enrollmentOptions calls options endpoint', () => {
    service.enrollmentOptions('c1', { limit: 50 });
    expect(getUrl).toContain('/classes/c1/enrollment-options');
  });

  it('listByMember calls members classes endpoint', () => {
    service.listByMember('mem1');
    expect(getUrl).toContain('/members/mem1/classes');
  });

  it('getSessionAttendance calls attendance endpoint with sessionDate', () => {
    service.getSessionAttendance('c1', '2026-07-13');
    expect(getUrl).toContain('/classes/c1/attendance');
    expect(getOptions).toEqual(
      expect.objectContaining({
        params: expect.anything(),
      }),
    );
  });

  it('saveSessionAttendance puts attendance body', () => {
    const body = {
      sessionDate: '2026-07-13',
      entries: [{ memberId: 'm1', present: true, notes: null }],
    };
    service.saveSessionAttendance('c1', body);
    expect(putUrl).toContain('/classes/c1/attendance');
    expect(putBody).toEqual(body);
  });

  it('frequencyReport calls frequency endpoint', () => {
    service.frequencyReport('c1', { from: '2026-01-01', to: '2026-07-18' });
    expect(getUrl).toContain('/classes/c1/reports/frequency');
  });

  it('frequencyCsv requests blob response', () => {
    service.frequencyCsv('c1', { from: '2026-01-01', to: '2026-07-18' });
    expect(getUrl).toContain('/classes/c1/reports/frequency.csv');
    expect(getOptions).toEqual(
      expect.objectContaining({
        responseType: 'blob',
      }),
    );
  });
});
