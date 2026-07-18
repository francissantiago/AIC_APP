import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SchedulesService } from './schedules-service';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let getUrl = '';
  let postUrl = '';
  let putUrl = '';
  let putBody: unknown;
  let patchUrl = '';
  let deleteUrl = '';

  beforeEach(() => {
    TestBed.resetTestingModule();
    getUrl = '';
    postUrl = '';
    putUrl = '';
    putBody = undefined;
    patchUrl = '';
    deleteUrl = '';
    TestBed.configureTestingModule({
      providers: [
        SchedulesService,
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              getUrl = url;
              return of({ data: [], total: 0, page: 1, limit: 20, events: [], from: '', to: '' });
            },
            post: (url: string) => {
              postUrl = url;
              return of({});
            },
            put: (url: string, body: unknown) => {
              putUrl = url;
              putBody = body;
              return of([]);
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
    service = TestBed.inject(SchedulesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listAssignments calls assignments endpoint', () => {
    service.listAssignments({ page: 1, limit: 20 });
    expect(getUrl).toContain('/schedules/assignments');
  });

  it('getWeekView calls week endpoint', () => {
    service.getWeekView({ from: '2026-07-13', to: '2026-07-19' });
    expect(getUrl).toContain('/schedules/week');
  });

  it('listEventAssignments calls event assignments endpoint', () => {
    service.listEventAssignments('e1');
    expect(getUrl).toContain('/schedules/events/e1/assignments');
  });

  it('bulkUpsertAssignments puts batch body', () => {
    service.bulkUpsertAssignments('e1', 'm1', {
      items: [{ memberId: 'mem1', roleLabel: 'Vocal', confirmed: true }],
    });
    expect(putUrl).toContain('/schedules/events/e1/ministries/m1/assignments');
    expect(putBody).toEqual({
      items: [{ memberId: 'mem1', roleLabel: 'Vocal', confirmed: true }],
    });
  });

  it('memberOptions calls member-options endpoint', () => {
    service.memberOptions({ ministryId: 'm1' });
    expect(getUrl).toContain('/schedules/member-options');
  });

  it('createAssignment posts assignment', () => {
    service.createAssignment({
      calendarEventId: 'e1',
      ministryId: 'm1',
      memberId: 'mem1',
      roleLabel: 'Porta',
    });
    expect(postUrl).toContain('/schedules/assignments');
  });

  it('updateAssignment patches assignment', () => {
    service.updateAssignment('a1', { confirmed: true });
    expect(patchUrl).toContain('/schedules/assignments/a1');
  });

  it('removeAssignment deletes assignment', () => {
    service.removeAssignment('a1');
    expect(deleteUrl).toContain('/schedules/assignments/a1');
  });
});
