import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MinistriesService } from '@services/ministries-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MemberForm } from './member-form';

describe('MemberForm', () => {
  let component: MemberForm;
  let fixture: ComponentFixture<MemberForm>;
  const listByMember = vi.fn(() =>
    of([
      {
        id: 'm1',
        congregationId: 'c1',
        name: 'Louvor',
        description: null,
        leaderMemberId: null,
        leaderFullName: null,
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
    ]),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    listByMember.mockClear();
    await TestBed.configureTestingModule({
      imports: [MemberForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: ['ministries:read'] }),
            hasPermission: (code: string) => code === 'ministries:read',
          },
        },
        {
          provide: MembersService,
          useValue: {
            getById: () =>
              of({
                id: 'mem1',
                fullName: 'Ana',
                email: null,
                phone: null,
                document: null,
                birthDate: null,
                gender: 'unspecified',
                maritalStatus: 'other',
                status: 'active',
                baptismDate: null,
                membershipDate: null,
                address: null,
                city: null,
                state: null,
                zipCode: null,
                notes: null,
                userId: null,
                congregationId: 'c1',
                createdAt: '',
                updatedAt: '',
              }),
            create: () => of({}),
            update: () => of({}),
          },
        },
        {
          provide: MinistriesService,
          useValue: {
            listByMember,
            list: () => of({ data: [], total: 0, page: 1, limit: 100 }),
            addMember: () => of({}),
            removeMember: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(MemberForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberForm);
    fixture.componentRef.setInput('memberId', 'mem1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads ministries for member when ministries:read', () => {
    expect(listByMember).toHaveBeenCalledWith('mem1');
    expect(component.memberMinistries().length).toBe(1);
    expect(component.showMinistriesTab()).toBe(true);
  });
});
