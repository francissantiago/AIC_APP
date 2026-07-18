import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { Subject } from 'rxjs';
import { SidebarNav } from './sidebar-nav';

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
          useValue: {
            currentUser: signal(null),
          },
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

  it('should expose four production nav items without example', () => {
    expect(component.items.length).toBe(4);
    expect(component.items.map((item) => item.route)).toEqual([
      '/users',
      '/roles',
      '/members',
      '/congregation',
    ]);
    expect(component.items.some((item) => item.route.includes('example'))).toBe(false);
  });
});
