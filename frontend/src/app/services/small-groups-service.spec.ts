import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SmallGroupMemberRole } from '@enums/small-group-member-role';
import { of } from 'rxjs';
import { SmallGroupsService } from './small-groups-service';

describe('SmallGroupsService', () => {
  let service: SmallGroupsService;
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
        SmallGroupsService,
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              getUrl = url;
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
    service = TestBed.inject(SmallGroupsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list calls small-groups endpoint', () => {
    service.list({ page: 1, limit: 20 });
    expect(getUrl).toContain('/small-groups');
  });

  it('listMembers calls members endpoint', () => {
    service.listMembers('g1', { page: 1, limit: 20 });
    expect(getUrl).toContain('/small-groups/g1/members');
  });

  it('addMember posts member body', () => {
    service.addMember('g1', { memberId: 'm1', role: SmallGroupMemberRole.MEMBER });
    expect(postUrl).toContain('/small-groups/g1/members');
  });

  it('createMeeting posts meeting', () => {
    service.createMeeting('g1', { meetingDate: '2026-07-18' });
    expect(postUrl).toContain('/small-groups/g1/meetings');
  });

  it('saveMeetingAttendance puts attendance batch', () => {
    service.saveMeetingAttendance('g1', 'mt1', {
      entries: [{ memberId: 'm1', present: true }],
    });
    expect(putUrl).toContain('/small-groups/g1/meetings/mt1/attendance');
    expect(putBody).toEqual({ entries: [{ memberId: 'm1', present: true }] });
  });

  it('frequencyReport calls frequency endpoint', () => {
    service.frequencyReport('g1', { from: '2026-01-01', to: '2026-07-18' });
    expect(getUrl).toContain('/small-groups/g1/reports/frequency');
  });

  it('remove deletes group', () => {
    service.remove('g1');
    expect(deleteUrl).toContain('/small-groups/g1');
  });

  it('updateMember patches member', () => {
    service.updateMember('g1', 'm1', { role: SmallGroupMemberRole.ASSISTANT });
    expect(patchUrl).toContain('/small-groups/g1/members/m1');
  });
});
