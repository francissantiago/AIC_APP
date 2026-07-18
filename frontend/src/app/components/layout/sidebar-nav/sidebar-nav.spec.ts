import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { Subject } from 'rxjs';
import { SidebarNav } from './sidebar-nav';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

describe('SidebarNav', () => {
  let component: SidebarNav;
  let fixture: ComponentFixture<SidebarNav>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SidebarNav],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/users',
            events: new Subject().asObservable(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: authStub([]),
        },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(SidebarNav, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SidebarNav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides all cadastro items without read permissions', () => {
    expect(component.items().length).toBe(0);
  });

  it('canViewFinanceSection is false without finance or assets read', () => {
    expect(component.canViewFinanceSection()).toBe(false);
  });

  it('canViewSecretariat is false without secretariat:read permission', () => {
    expect(component.canViewSecretariat()).toBe(false);
  });
});

describe('SidebarNav with permissions', () => {
  let component: SidebarNav;
  let fixture: ComponentFixture<SidebarNav>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SidebarNav],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/users',
            events: new Subject().asObservable(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: authStub([
            'users:read',
            'roles:read',
            'members:read',
            'congregations:read',
            'finance:read',
            'assets:read',
            'secretariat:read',
          ]),
        },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(SidebarNav, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SidebarNav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows four cadastro items when user has all read permissions', () => {
    expect(component.items().length).toBe(4);
    expect(component.items().map((item) => item.route)).toEqual([
      '/users',
      '/roles',
      '/members',
      '/congregation',
    ]);
  });

  it('canViewFinanceSection is true when user has finance:read', () => {
    expect(component.canViewFinanceSection()).toBe(true);
  });

  it('financeItems includes assets when user has assets:read', () => {
    expect(component.financeItems().some((item) => item.route === '/finance/assets')).toBe(true);
  });

  it('canViewSecretariat is true when user has secretariat:read', () => {
    expect(component.canViewSecretariat()).toBe(true);
  });
});

describe('SidebarNav assets-only finance section', () => {
  let component: SidebarNav;
  let fixture: ComponentFixture<SidebarNav>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SidebarNav],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/finance/assets',
            events: new Subject().asObservable(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: authStub(['assets:read']),
        },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(SidebarNav, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SidebarNav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows finance section with only assets submenu for assets:read', () => {
    expect(component.canViewFinanceSection()).toBe(true);
    expect(component.financeItems()).toEqual([
      { route: '/finance/assets', labelKey: 'NAV.ASSETS', permission: 'assets:read' },
    ]);
  });
});
