import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SmallGroupAttendance } from './small-group-attendance';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('SmallGroupAttendance', () => {
  let component: SmallGroupAttendance;
  let fixture: ComponentFixture<SmallGroupAttendance>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupAttendance],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: AuthService, useValue: authStub(['small-groups:read', 'small-groups:write']) },
        {
          provide: SmallGroupsService,
          useValue: {
            getMeetingAttendance: () =>
              of({
                smallGroupId: 'g1',
                smallGroupName: 'Célula',
                meetingId: 'mt1',
                meetingDate: '2026-07-18',
                entries: [],
              }),
            saveMeetingAttendance: () => of({}),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: null }) },
        },
      ],
    })
      .overrideComponent(SmallGroupAttendance, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupAttendance);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groupId', 'g1');
    fixture.componentRef.setInput('meetingId', 'mt1');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows write when permission is present', () => {
    expect(component.canWrite()).toBe(true);
  });
});
