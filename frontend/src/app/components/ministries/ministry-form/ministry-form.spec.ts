import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { MinistryStatus } from '@enums/ministry-status';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MinistriesService } from '@services/ministries-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MinistryForm } from './ministry-form';

describe('MinistryForm', () => {
  let component: MinistryForm;
  let fixture: ComponentFixture<MinistryForm>;
  const create = vi.fn(() =>
    of({
      id: 'm1',
      congregationId: 'c1',
      name: 'Louvor',
      description: null,
      leaderMemberId: null,
      leaderFullName: null,
      status: 'active',
      createdAt: '',
      updatedAt: '',
    }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    create.mockClear();
    await TestBed.configureTestingModule({
      imports: [MinistryForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions: ['ministries:write', 'members:read'] }),
            hasPermission: (code: string) => ['ministries:write', 'members:read'].includes(code),
          },
        },
        {
          provide: MinistriesService,
          useValue: {
            getById: () => of(null),
            create,
            update: () => of({}),
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
      .overrideComponent(MinistryForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MinistryForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls create on valid submit', () => {
    component.form.patchValue({ name: 'Louvor', status: MinistryStatus.ACTIVE });
    component.submit();
    expect(create).toHaveBeenCalled();
  });
});
