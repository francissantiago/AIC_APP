import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { CongregationStatus } from '@enums/congregation-status';
import { CongregationType } from '@enums/congregation-type';
import { AuthService } from '@services/auth-service';
import { CongregationsService } from '@services/congregations-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { CongregationsList } from './congregations-list';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('CongregationsList', () => {
  let component: CongregationsList;
  let fixture: ComponentFixture<CongregationsList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CongregationsList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['congregations:read']),
        },
        {
          provide: CongregationsService,
          useValue: {
            findAll: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(CongregationsList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CongregationsList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides manage_branches actions without permission', () => {
    expect(component.canManageBranches()).toBe(false);
  });
});

describe('CongregationsList with manage_branches', () => {
  let component: CongregationsList;
  let fixture: ComponentFixture<CongregationsList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CongregationsList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['congregations:read', 'congregations:manage_branches']),
        },
        {
          provide: CongregationsService,
          useValue: {
            findAll: () =>
              of({
                data: [
                  {
                    id: 'c1',
                    name: 'Matriz',
                    tradeName: null,
                    type: CongregationType.HEADQUARTERS,
                    parentId: null,
                    branchesCount: 1,
                    document: null,
                    email: null,
                    phone: null,
                    address: null,
                    city: 'SP',
                    state: 'SP',
                    zipCode: null,
                    foundationDate: null,
                    website: null,
                    status: CongregationStatus.ACTIVE,
                    notes: null,
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
      .overrideComponent(CongregationsList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CongregationsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('allows create when user has manage_branches', () => {
    expect(component.canManageBranches()).toBe(true);
  });
});
