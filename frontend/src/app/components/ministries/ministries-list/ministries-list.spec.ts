import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { MinistryStatus } from '@enums/ministry-status';
import { AuthService } from '@services/auth-service';
import { MinistriesService } from '@services/ministries-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { MinistriesList } from './ministries-list';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('MinistriesList', () => {
  let component: MinistriesList;
  let fixture: ComponentFixture<MinistriesList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MinistriesList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['ministries:read']),
        },
        {
          provide: MinistriesService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(MinistriesList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MinistriesList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides write actions when canWrite is false', () => {
    expect(component.canWrite()).toBe(false);
  });
});

describe('MinistriesList with write permission', () => {
  let component: MinistriesList;
  let fixture: ComponentFixture<MinistriesList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MinistriesList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['ministries:read', 'ministries:write']),
        },
        {
          provide: MinistriesService,
          useValue: {
            list: () =>
              of({
                data: [
                  {
                    id: 'm1',
                    congregationId: 'c1',
                    name: 'Louvor',
                    description: null,
                    leaderMemberId: null,
                    leaderFullName: null,
                    status: MinistryStatus.ACTIVE,
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
      .overrideComponent(MinistriesList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MinistriesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('allows write when user has ministries:write', () => {
    expect(component.canWrite()).toBe(true);
  });

  it('loads ministries into signal', () => {
    expect(component.ministries().length).toBe(1);
    expect(component.ministries()[0]?.name).toBe('Louvor');
  });
});
