import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SmallGroupMembersPanel } from './small-group-members-panel';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('SmallGroupMembersPanel', () => {
  let component: SmallGroupMembersPanel;
  let fixture: ComponentFixture<SmallGroupMembersPanel>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupMembersPanel],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: AuthService, useValue: authStub(['small-groups:read']) },
        {
          provide: SmallGroupsService,
          useValue: {
            listMembers: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            memberOptions: () => of([]),
            addMember: () => of({}),
            updateMember: () => of({}),
            removeMember: () => of(undefined),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: null }) },
        },
      ],
    })
      .overrideComponent(SmallGroupMembersPanel, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupMembersPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groupId', 'g1');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides write actions without write permission', () => {
    expect(component.canWrite()).toBe(false);
  });
});
