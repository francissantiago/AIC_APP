import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SmallGroupMeetingsPanel } from './small-group-meetings-panel';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('SmallGroupMeetingsPanel', () => {
  let component: SmallGroupMeetingsPanel;
  let fixture: ComponentFixture<SmallGroupMeetingsPanel>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupMeetingsPanel],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: AuthService, useValue: authStub(['small-groups:read', 'small-groups:write']) },
        {
          provide: SmallGroupsService,
          useValue: {
            listMeetings: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            createMeeting: () => of({}),
            updateMeeting: () => of({}),
            removeMeeting: () => of(undefined),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: null }) },
        },
      ],
    })
      .overrideComponent(SmallGroupMeetingsPanel, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupMeetingsPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groupId', 'g1');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows write when permission is present', () => {
    expect(component.canWrite()).toBe(true);
  });
});
