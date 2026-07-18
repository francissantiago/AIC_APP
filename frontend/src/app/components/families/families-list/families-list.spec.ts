import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { FamiliesList } from './families-list';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('FamiliesList', () => {
  let component: FamiliesList;
  let fixture: ComponentFixture<FamiliesList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FamiliesList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['members:read']),
        },
        {
          provide: FamiliesService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(FamiliesList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FamiliesList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides write actions when canWrite is false', () => {
    expect(component.canWrite()).toBe(false);
  });
});

describe('FamiliesList with write permission', () => {
  let component: FamiliesList;
  let fixture: ComponentFixture<FamiliesList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FamiliesList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['members:read', 'members:write']),
        },
        {
          provide: FamiliesService,
          useValue: {
            list: () =>
              of({
                data: [
                  {
                    id: 'f1',
                    congregationId: 'c1',
                    name: 'Família Silva',
                    notes: null,
                    headMemberId: null,
                    headMemberName: null,
                    membersCount: 2,
                    createdAt: '',
                    updatedAt: '',
                  },
                ],
                total: 1,
                page: 1,
                limit: 20,
              }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(FamiliesList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FamiliesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('allows write when user has members:write', () => {
    expect(component.canWrite()).toBe(true);
  });

  it('loads families into signal', () => {
    expect(component.families().length).toBe(1);
    expect(component.families()[0]?.name).toBe('Família Silva');
  });
});
