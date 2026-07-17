import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { translateServiceStub } from '../../testing/translate-testing';
import { SidebarNav } from './sidebar-nav';

describe('SidebarNav', () => {
  let component: SidebarNav;
  let fixture: ComponentFixture<SidebarNav>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SidebarNav],
      providers: [
        provideRouter([]),
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
