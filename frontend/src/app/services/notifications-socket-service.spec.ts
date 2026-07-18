import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@services/auth-service';
import { NotificationsService } from '@services/notifications-service';
import { NotificationsSocketService } from './notifications-socket-service';

const { ioMock, socketMock } = vi.hoisted(() => {
  const socketMock = {
    connected: false,
    on: vi.fn(),
    io: { on: vi.fn() },
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
  };
  const ioMock = vi.fn(() => socketMock);
  return { ioMock, socketMock };
});

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

describe('NotificationsSocketService', () => {
  let service: NotificationsSocketService;
  let accessToken: ReturnType<typeof signal<string | null>>;
  let notificationsService: {
    handleIncomingNotification: ReturnType<typeof vi.fn>;
    reconcile: ReturnType<typeof vi.fn>;
    panelOpen: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    socketMock.connected = false;
    accessToken = signal<string | null>(null);
    notificationsService = {
      handleIncomingNotification: vi.fn(),
      reconcile: vi.fn(),
      panelOpen: signal(false),
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationsSocketService,
        {
          provide: AuthService,
          useValue: { accessToken },
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    });
    service = TestBed.inject(NotificationsSocketService);
  });

  afterEach(() => {
    service.disconnect();
  });

  it('connect should pass auth.token to socket.io', () => {
    service.connect('jwt-token');

    expect(ioMock).toHaveBeenCalledWith(
      '/ws',
      expect.objectContaining({
        path: '/socket.io',
        auth: { token: 'jwt-token' },
        reconnection: true,
      }),
    );
  });

  it('disconnect should clear socket listeners', () => {
    service.connect('jwt-token');
    service.disconnect();

    expect(socketMock.removeAllListeners).toHaveBeenCalled();
    expect(socketMock.disconnect).toHaveBeenCalled();
    expect(service.connectionStatus()).toBe('disconnected');
  });

  it('notification:new listener should forward payload', () => {
    service.connect('jwt-token');

    const onCalls = socketMock.on.mock.calls as [string, (payload: unknown) => void][];
    const handler = onCalls.find(([event]) => event === 'notification:new')?.[1];
    expect(handler).toBeTypeOf('function');

    const payload = {
      id: 'n1',
      type: 'visitor_follow_up' as const,
      title: 'Follow-up',
      createdAt: '2026-07-18T12:00:00.000Z',
    };
    handler?.(payload);

    expect(notificationsService.handleIncomingNotification).toHaveBeenCalledWith(payload);
  });
});
