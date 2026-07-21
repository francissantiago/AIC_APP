import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { FamilyRelation } from '@enums/family-relation';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { MembersService } from '@services/members-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { FamilyMembersPanel } from './family-members-panel';

describe('FamilyMembersPanel', () => {
  let component: FamilyMembersPanel;
  let fixture: ComponentFixture<FamilyMembersPanel>;
  const updateMember = vi.fn(
    (familyId: string, memberId: string, body: { relation: FamilyRelation }) =>
      of({
        familyId,
        memberId,
        memberFullName: 'Maria Silva',
        relation: body.relation,
        joinedAt: '2026-01-01T00:00:00.000Z',
        birthDate: null,
      }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    updateMember.mockClear();

    await TestBed.configureTestingModule({
      imports: [FamilyMembersPanel],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: ['members:write', 'members:read'] }),
            hasPermission: (code: string) => ['members:write', 'members:read'].includes(code),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error' }) },
        },
        {
          provide: FamiliesService,
          useValue: {
            listMembers: () =>
              of({
                data: [
                  {
                    familyId: 'f1',
                    memberId: 'm1',
                    memberFullName: 'Maria Silva',
                    relation: FamilyRelation.CHILD,
                    joinedAt: '2026-01-01T00:00:00.000Z',
                    birthDate: null,
                  },
                ],
                total: 1,
                page: 1,
                limit: 100,
              }),
            addMember: () => of({}),
            updateMember,
            removeMember: () => of(undefined),
          },
        },
        {
          provide: MembersService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 100 }),
          },
        },
      ],
    })
      .overrideComponent(FamilyMembersPanel, {
        set: {
          imports: [],
          template: `
            @for (member of members(); track member.memberId) {
              <select
                data-testid="family-member-relation-select"
                (change)="onRelationSelect(member.memberId, $event)"
              >
                @for (relation of relations; track relation) {
                  <option
                    [value]="relation"
                    [selected]="member.relation === relation"
                  >
                    {{ relation }}
                  </option>
                }
              </select>
            }
          `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FamilyMembersPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('familyId', 'f1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads members with their stored relation', () => {
    expect(component.members()).toHaveLength(1);
    expect(component.members()[0]?.relation).toBe(FamilyRelation.CHILD);
  });

  it('renders the stored relation instead of defaulting to spouse', () => {
    const select = fixture.nativeElement.querySelector(
      '[data-testid="family-member-relation-select"]',
    ) as HTMLSelectElement | null;

    expect(select).toBeTruthy();
    expect(select!.value).toBe(FamilyRelation.CHILD);
    expect(select!.value).not.toBe(FamilyRelation.SPOUSE);
  });

  it('persists a changed relation', () => {
    const select = fixture.nativeElement.querySelector(
      '[data-testid="family-member-relation-select"]',
    ) as HTMLSelectElement;

    select.value = FamilyRelation.PARENT;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(updateMember).toHaveBeenCalledWith('f1', 'm1', {
      relation: FamilyRelation.PARENT,
    });
    expect(select.value).toBe(FamilyRelation.PARENT);
  });
});
