import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassStatus } from '@enums/class-status';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { ClassesList } from './classes-list';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('ClassesList', () => {
  let component: ClassesList;
  let fixture: ComponentFixture<ClassesList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClassesList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['classes:read']),
        },
        {
          provide: ClassesService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(ClassesList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClassesList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides write actions when canWrite is false', () => {
    expect(component.canWrite()).toBe(false);
  });
});

describe('ClassesList with write permission', () => {
  let component: ClassesList;
  let fixture: ComponentFixture<ClassesList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClassesList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['classes:read', 'classes:write']),
        },
        {
          provide: ClassesService,
          useValue: {
            list: () =>
              of({
                data: [
                  {
                    id: 'c1',
                    congregationId: 'cong1',
                    name: 'Classe de Jovens',
                    description: null,
                    ageGroup: ClassAgeGroup.YOUTH,
                    teacherMemberId: null,
                    teacher: null,
                    dayOfWeek: 0,
                    startTime: '09:00:00',
                    room: 'Sala 3',
                    status: ClassStatus.ACTIVE,
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
      .overrideComponent(ClassesList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClassesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('allows write when user has classes:write', () => {
    expect(component.canWrite()).toBe(true);
  });

  it('loads classes into signal', () => {
    expect(component.classes().length).toBe(1);
    expect(component.classes()[0]?.name).toBe('Classe de Jovens');
  });
});
