import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { MinistriesService } from '@services/ministries-service';
import { SchedulesService } from '@services/schedules-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { SchedulesBoard } from './schedules-board';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('SchedulesBoard', () => {
  let component: SchedulesBoard;
  let fixture: ComponentFixture<SchedulesBoard>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SchedulesBoard],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: AuthService, useValue: authStub(['schedules:read']) },
        {
          provide: SchedulesService,
          useValue: {
            getWeekView: () => of({ from: '', to: '', events: [] }),
          },
        },
        {
          provide: MinistriesService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 100 }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    })
      .overrideComponent(SchedulesBoard, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SchedulesBoard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides write actions when canWrite is false', () => {
    expect(component.canWrite()).toBe(false);
  });
});

describe('SchedulesBoard with write permission', () => {
  let component: SchedulesBoard;
  let fixture: ComponentFixture<SchedulesBoard>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SchedulesBoard],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        {
          provide: AuthService,
          useValue: authStub(['schedules:read', 'schedules:write']),
        },
        {
          provide: SchedulesService,
          useValue: {
            getWeekView: () => of({ from: '', to: '', events: [] }),
          },
        },
        {
          provide: MinistriesService,
          useValue: {
            list: () => of({ data: [], total: 0, page: 1, limit: 100 }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    })
      .overrideComponent(SchedulesBoard, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SchedulesBoard);
    component = fixture.componentInstance;
  });

  it('exposes canWrite when schedules:write is present', () => {
    expect(component.canWrite()).toBe(true);
  });
});
