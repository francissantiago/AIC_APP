import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { MinistryMemberRole } from '@enums/ministry-member-role';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MinistriesService } from '@services/ministries-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MinistryMembersPanel } from './ministry-members-panel';

describe('MinistryMembersPanel', () => {
  let component: MinistryMembersPanel;
  let fixture: ComponentFixture<MinistryMembersPanel>;
  const addMember = vi.fn(() =>
    of({
      ministryId: 'm1',
      memberId: 'mem1',
      memberFullName: 'Ana',
      role: 'member',
      joinedAt: '2026-07-18T00:00:00.000Z',
    }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    addMember.mockClear();
    await TestBed.configureTestingModule({
      imports: [MinistryMembersPanel],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              permissions: ['ministries:write', 'members:read'],
            }),
            hasPermission: (code: string) => ['ministries:write', 'members:read'].includes(code),
          },
        },
        {
          provide: MinistriesService,
          useValue: {
            listMembers: () => of({ data: [], total: 0, page: 1, limit: 100 }),
            addMember,
            updateMemberRole: () => of({}),
            removeMember: () => of(undefined),
          },
        },
        {
          provide: MembersService,
          useValue: {
            list: () =>
              of({
                data: [{ id: 'mem1', fullName: 'Ana' }],
                total: 1,
                page: 1,
                limit: 100,
              }),
          },
        },
      ],
    })
      .overrideComponent(MinistryMembersPanel, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MinistryMembersPanel);
    fixture.componentRef.setInput('ministryId', 'm1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links a member via service', () => {
    component.linkForm.patchValue({
      memberId: 'mem1',
      role: MinistryMemberRole.ASSISTANT,
    });
    component.linkMember();
    expect(addMember).toHaveBeenCalledWith('m1', {
      memberId: 'mem1',
      role: MinistryMemberRole.ASSISTANT,
    });
  });
});
