import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { MembersService } from '@services/members-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { FamilyForm } from './family-form';

describe('FamilyForm', () => {
  let component: FamilyForm;
  let fixture: ComponentFixture<FamilyForm>;
  const create = vi.fn(() =>
    of({
      id: 'f1',
      congregationId: 'c1',
      name: 'Família Silva',
      notes: null,
      headMemberId: null,
      headMemberName: null,
      createdAt: '',
      updatedAt: '',
    }),
  );

  beforeEach(async () => {
    TestBed.resetTestingModule();
    create.mockClear();
    await TestBed.configureTestingModule({
      imports: [FamilyForm],
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
          provide: FamiliesService,
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
      .overrideComponent(FamilyForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FamilyForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls create on valid submit', () => {
    component.form.patchValue({ name: 'Família Silva' });
    component.submit();
    expect(create).toHaveBeenCalled();
  });
});
