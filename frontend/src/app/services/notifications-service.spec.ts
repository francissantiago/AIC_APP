import { HttpClient, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of } from 'rxjs';
import { NotificationsService } from './notifications-service';

describe('NotificationsService', () => {
  const baseUrl = `${environment.apiUrl}/notifications`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let service: NotificationsService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      patch: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [NotificationsService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(NotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list should GET notifications with query params', () => {
    http.get.mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 }));

    service.list({ page: 1, limit: 20, unreadOnly: true }).subscribe();

    expect(http.get).toHaveBeenCalledTimes(1);
    const [url, options] = http.get.mock.calls[0] as [string, { params: HttpParams }];
    expect(url).toBe(baseUrl);
    expect(options.params.get('page')).toBe('1');
    expect(options.params.get('limit')).toBe('20');
    expect(options.params.get('unreadOnly')).toBe('true');
  });

  it('getUnreadCount should GET unread-count and update signal', () => {
    http.get.mockReturnValue(of({ count: 3 }));

    service.getUnreadCount().subscribe();

    expect(http.get).toHaveBeenCalledWith(`${baseUrl}/unread-count`, expect.any(Object));
    expect(service.unreadCount()).toBe(3);
  });

  it('markAllAsRead should PATCH read-all and zero unread', () => {
    service.unreadCount.set(2);
    service.items.set([
      {
        id: 'n1',
        type: 'visitor_follow_up',
        title: 'A',
        body: '',
        payload: null,
        referenceType: 'visitor',
        referenceId: 'r1',
        readAt: null,
        createdAt: '2026-07-18T12:00:00.000Z',
      },
    ]);
    http.patch.mockReturnValue(of({ updated: 2 }));

    service.markAllAsRead().subscribe();

    expect(http.patch).toHaveBeenCalledWith(`${baseUrl}/read-all`, {}, expect.any(Object));
    expect(service.unreadCount()).toBe(0);
    expect(service.items()[0]?.readAt).toBeTruthy();
  });

  it('handleIncomingNotification should increment unread count', () => {
    service.unreadCount.set(1);

    service.handleIncomingNotification({
      id: 'n2',
      type: 'schedule_reminder',
      title: 'Lembrete',
      createdAt: '2026-07-18T13:00:00.000Z',
    });

    expect(service.unreadCount()).toBe(2);
  });
});
