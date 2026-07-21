import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NotificationsService } from '@services/notifications-service';
import { NotificationsSocketService } from '@services/notifications-socket-service';
import { translateServiceStub } from '../../testing/translate-testing';
import { of } from 'rxjs';
import { NotificationsBell } from './notifications-bell';

describe('NotificationsBell', () => {
  let component: NotificationsBell;
  let fixture: ComponentFixture<NotificationsBell>;
  let notificationsService: {
    unreadCount: ReturnType<typeof signal<number>>;
    items: ReturnType<typeof signal<unknown[]>>;
    listLoading: ReturnType<typeof signal<boolean>>;
    listError: ReturnType<typeof signal<boolean>>;
    panelOpen: ReturnType<typeof signal<boolean>>;
    getUnreadCount: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    notificationsService = {
      unreadCount: signal(2),
      items: signal([]),
      listLoading: signal(false),
      listError: signal(false),
      panelOpen: signal(false),
      getUnreadCount: vi.fn(() => of({ count: 2 })),
      list: vi.fn(() => of({ data: [], total: 0, page: 1, limit: 20 })),
      markAllAsRead: vi.fn(() => of({ updated: 2 })),
      markAsRead: vi.fn(() => of({})),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsBell],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
        {
          provide: NotificationsSocketService,
          useValue: { connectionStatus: signal('connected') },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn() },
        },
        {
          provide: TranslateService,
          useValue: {
            ...translateServiceStub(),
            instant: (key: string, params?: Record<string, string>) => {
              if (key === 'NOTIFICATIONS.VISITOR_FOLLOW_UP_TITLE') {
                return 'Acompanhamento de visitante pendente';
              }
              if (key === 'NOTIFICATIONS.VISITOR_FOLLOW_UP_BODY') {
                return `O visitante ${params?.['name'] ?? ''} aguarda acompanhamento`;
              }
              return key;
            },
          },
        },
        { provide: TranslatePipe, useValue: { transform: (key: string) => key } },
      ],
    })
      .overrideComponent(NotificationsBell, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NotificationsBell);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose badge when unread > 0', () => {
    expect(component.badgeLabel()).toBe('2');
    notificationsService.unreadCount.set(0);
    expect(component.badgeLabel()).toBeNull();
  });

  it('markAllAsRead should call service', () => {
    component.markAllAsRead();
    expect(notificationsService.markAllAsRead).toHaveBeenCalled();
  });

  it('openPanel should load list', () => {
    component.openPanel();
    expect(notificationsService.panelOpen()).toBe(true);
    expect(notificationsService.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('localizes visitor follow-up notification copy', () => {
    const notification = {
      id: 'n1',
      type: 'visitor_follow_up' as const,
      title: 'Follow-up de visitante pendente',
      body: 'raw',
      payload: { visitorFullName: 'Maria', visitDate: '2026-07-01' },
      referenceType: 'visitor' as const,
      referenceId: 'v1',
      readAt: null,
      createdAt: '2026-07-21T10:00:00.000Z',
    };

    expect(component.notificationTitle(notification)).toBe('Acompanhamento de visitante pendente');
    expect(component.notificationBody(notification)).toBe(
      'O visitante Maria aguarda acompanhamento',
    );
  });
});
