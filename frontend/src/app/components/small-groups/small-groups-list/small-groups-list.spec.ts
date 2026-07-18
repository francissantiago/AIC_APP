import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SmallGroupsList } from './small-groups-list';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('SmallGroupsList', () => {
  let component: SmallGroupsList;
  let fixture: ComponentFixture<SmallGroupsList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupsList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: AuthService, useValue: authStub(['small-groups:read']) },
        {
          provide: SmallGroupsService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(SmallGroupsList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupsList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides write actions when canWrite is false', () => {
    expect(component.canWrite()).toBe(false);
  });
});

describe('SmallGroupsList with write permission', () => {
  let component: SmallGroupsList;
  let fixture: ComponentFixture<SmallGroupsList>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SmallGroupsList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['small-groups:read', 'small-groups:write']),
        },
        {
          provide: SmallGroupsService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 20 }),
            remove: () => of(undefined),
          },
        },
      ],
    })
      .overrideComponent(SmallGroupsList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmallGroupsList);
    component = fixture.componentInstance;
  });

  it('shows write actions when canWrite is true', () => {
    expect(component.canWrite()).toBe(true);
  });
});
