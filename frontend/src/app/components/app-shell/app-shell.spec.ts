import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { translateServiceStub } from '../../testing/translate-testing';
import { Subject } from 'rxjs';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  let component: AppShell;
  let fixture: ComponentFixture<AppShell>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(async () => {
    routerEvents$ = new Subject<NavigationEnd>();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/users',
            events: routerEvents$.asObservable(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            logout: vi.fn(),
            isAuthenticated: signal(true),
          },
        },
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(AppShell, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppShell);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    routerEvents$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggleSidebar should flip expanded state and cancel pending auto-collapse', () => {
    vi.useFakeTimers();
    component.sidebarExpanded.set(true);
    component.onSidebarLeave();
    component.toggleSidebar();
    vi.advanceTimersByTime(2000);

    expect(component.sidebarExpanded()).toBe(false);
  });

  it('should auto-collapse after 2s on sidebar leave when expanded', () => {
    vi.useFakeTimers();
    component.sidebarExpanded.set(true);
    component.onSidebarLeave();
    vi.advanceTimersByTime(1999);
    expect(component.sidebarExpanded()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(component.sidebarExpanded()).toBe(false);
  });

  it('should cancel auto-collapse when pointer re-enters sidebar', () => {
    vi.useFakeTimers();
    component.sidebarExpanded.set(true);
    component.onSidebarLeave();
    vi.advanceTimersByTime(1000);
    component.onSidebarEnter();
    vi.advanceTimersByTime(1000);

    expect(component.sidebarExpanded()).toBe(true);
  });

  it('should remain collapsed when focused', () => {
    component.sidebarExpanded.set(false);
    component.onSidebarFocusIn();
    expect(component.sidebarExpanded()).toBe(false);
  });

  it('should remain collapsed when pointer enters', () => {
    component.sidebarExpanded.set(false);
    component.onSidebarEnter();
    expect(component.sidebarExpanded()).toBe(false);
  });

  it('should not schedule auto-collapse when already collapsed', () => {
    vi.useFakeTimers();
    component.sidebarExpanded.set(false);
    component.onSidebarLeave();
    vi.advanceTimersByTime(1000);
    expect(component.sidebarExpanded()).toBe(false);
  });
});
