import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  GoogleCalendarConflictPolicy,
  GoogleCalendarConnectionStatus,
  GoogleCalendarSyncDirection,
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';
import { CalendarEvent } from './entities/calendar-event.entity';
import { GoogleCalendarConnection } from './entities/google-calendar-connection.entity';
import { GoogleCalendarEventLink } from './entities/google-calendar-event-link.entity';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

describe('GoogleCalendarSyncService', () => {
  const insert = jest.fn();
  const patch = jest.fn();
  const del = jest.fn();
  const list = jest.fn();
  const get = jest.fn();

  const calendarApi = {
    events: { insert, patch, delete: del, list, get },
  };

  const findActiveConnection = jest.fn();
  const getAuthorizedClient = jest.fn().mockResolvedValue({});
  const oauthService = {
    findActiveConnection,
    getAuthorizedClient,
    getStatus: jest.fn(),
  } as unknown as GoogleCalendarOAuthService;

  const connectionsSave = jest.fn((value: object) => value);
  const connectionsRepository = {
    save: connectionsSave,
    find: jest.fn(),
  } as unknown as Repository<GoogleCalendarConnection>;

  const linksFindOne = jest.fn();
  const linksSave = jest.fn((value: object) => value);
  const linksCreate = jest.fn((value: object) => value);
  const linksDelete = jest.fn();
  const linksRepository = {
    findOne: linksFindOne,
    save: linksSave,
    create: linksCreate,
    delete: linksDelete,
  } as unknown as Repository<GoogleCalendarEventLink>;

  const eventsFind = jest.fn();
  const eventsFindOne = jest.fn();
  const eventsSave = jest.fn((value: object) => ({
    id: 'aic-new',
    ...value,
  }));
  const eventsCreate = jest.fn((value: object) => value);
  const eventsSoftRemove = jest.fn();
  const calendarEventsRepository = {
    find: eventsFind,
    findOne: eventsFindOne,
    save: eventsSave,
    create: eventsCreate,
    softRemove: eventsSoftRemove,
  } as unknown as Repository<CalendarEvent>;

  const configService = {
    get: jest.fn().mockReturnValue('America/Sao_Paulo'),
  } as unknown as ConfigService;

  const congregationsService = {
    getOrCreateBase: jest.fn().mockResolvedValue({ id: 'cong-1' }),
  };

  let service: GoogleCalendarSyncService;

  const connection: GoogleCalendarConnection = {
    id: 'conn-1',
    congregationId: 'cong-1',
    connectedByUserId: 'user-1',
    googleAccountEmail: 'church@gmail.com',
    googleCalendarId: 'primary',
    accessTokenEncrypted: 'enc-a',
    refreshTokenEncrypted: 'enc-r',
    tokenExpiresAt: new Date(Date.now() + 3600_000),
    scopes: 'calendar',
    syncToken: null,
    syncDirection: GoogleCalendarSyncDirection.BIDIRECTIONAL,
    conflictPolicy: GoogleCalendarConflictPolicy.LATEST_WINS,
    status: GoogleCalendarConnectionStatus.ACTIVE,
    lastSyncAt: null,
    lastSyncError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const event: CalendarEvent = {
    id: 'event-1',
    congregationId: 'cong-1',
    createdByUserId: 'user-1',
    sourceMemberId: null,
    title: 'Culto',
    type: CalendarEventType.SERVICE,
    startsAt: new Date('2026-07-20T19:00:00.000Z'),
    endsAt: new Date('2026-07-20T21:00:00.000Z'),
    allDay: false,
    location: null,
    description: null,
    recurrenceFrequency: CalendarRecurrenceFrequency.NONE,
    recurrenceInterval: 1,
    recurrenceUntil: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleCalendarSyncService(
      configService,
      congregationsService as never,
      oauthService,
      connectionsRepository,
      linksRepository,
      calendarEventsRepository,
    );
    jest
      .spyOn(service as never, 'getCalendarApi' as never)
      .mockResolvedValue(calendarApi as never);
    findActiveConnection.mockResolvedValue(connection);
  });

  it('insert cria link quando evento não está mapeado', async () => {
    linksFindOne.mockResolvedValue(null);
    insert.mockResolvedValue({
      data: { id: 'g-1', etag: 'etag-1' },
    });

    await service.pushEvent(event, 'upsert');

    expect(insert).toHaveBeenCalled();
    expect(linksSave).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        calendarEventId: 'event-1',
        googleEventId: 'g-1',
      }),
    );
  });

  it('update usa google_event_id existente', async () => {
    linksFindOne.mockResolvedValue({
      id: 'link-1',
      connectionId: 'conn-1',
      calendarEventId: 'event-1',
      googleEventId: 'g-1',
      googleEtag: 'etag-1',
      contentHash: 'old',
    });
    patch.mockResolvedValue({ data: { etag: 'etag-2' } });

    await service.pushEvent(event, 'upsert');

    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'g-1',
      }),
    );
  });

  it('delete propaga para Google e remove link', async () => {
    linksFindOne.mockResolvedValue({
      id: 'link-1',
      googleEventId: 'g-1',
    });
    del.mockResolvedValue({});

    await service.pushEvent(event, 'delete');

    expect(del).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'g-1' }),
    );
    expect(linksDelete).toHaveBeenCalledWith({ id: 'link-1' });
  });

  it('push best-effort não lança se Google falhar', async () => {
    linksFindOne.mockResolvedValue(null);
    insert.mockRejectedValue(new Error('google down'));

    await expect(
      service.pushEventBestEffort(event, 'upsert'),
    ).resolves.toBeUndefined();
  });

  it('410 no syncToken reseta e continua', async () => {
    eventsFind.mockResolvedValue([]);
    list.mockRejectedValueOnce({ code: 410 }).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'g-new',
            status: 'confirmed',
            summary: 'Novo no Google',
            start: { dateTime: '2026-07-21T10:00:00.000Z' },
            end: { dateTime: '2026-07-21T11:00:00.000Z' },
          },
        ],
        nextSyncToken: 'token-2',
      },
    });
    linksFindOne.mockResolvedValue(null);
    eventsFindOne.mockResolvedValue(null);

    const withToken = {
      ...connection,
      syncToken: 'stale-token',
    };
    findActiveConnection.mockResolvedValue(withToken);

    const result = await service.syncNow('cong-1');

    expect(list).toHaveBeenCalledTimes(2);
    expect(result.pulled).toBe(1);
    expect(connectionsSave).toHaveBeenCalled();
  });

  it('conflito latest_wins aplica lado Google mais recente', async () => {
    const aicEvent = {
      ...event,
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    };
    linksFindOne.mockResolvedValue({
      id: 'link-1',
      connectionId: 'conn-1',
      calendarEventId: 'event-1',
      googleEventId: 'g-1',
      googleEtag: 'e1',
      contentHash: null,
    });
    eventsFindOne.mockResolvedValue(aicEvent);
    eventsFind.mockResolvedValue([]);
    list.mockResolvedValue({
      data: {
        items: [
          {
            id: 'g-1',
            status: 'confirmed',
            summary: 'Atualizado no Google',
            updated: '2026-07-10T00:00:00.000Z',
            start: { dateTime: '2026-07-21T10:00:00.000Z' },
            end: { dateTime: '2026-07-21T11:00:00.000Z' },
          },
        ],
        nextSyncToken: 'token-x',
      },
    });

    const result = await service.syncNow('cong-1');
    expect(result.pulled).toBe(1);
    expect(eventsSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Atualizado no Google' }),
    );
  });

  it('política aic_wins não sobrescreve evento AIC no pull', async () => {
    findActiveConnection.mockResolvedValue({
      ...connection,
      conflictPolicy: GoogleCalendarConflictPolicy.AIC_WINS,
    });
    eventsFind.mockResolvedValue([]);
    linksFindOne.mockResolvedValue({
      id: 'link-1',
      connectionId: 'conn-1',
      calendarEventId: 'event-1',
      googleEventId: 'g-1',
    });
    eventsFindOne.mockResolvedValue({
      ...event,
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    list.mockResolvedValue({
      data: {
        items: [
          {
            id: 'g-1',
            status: 'confirmed',
            summary: 'Google title',
            updated: '2026-07-20T00:00:00.000Z',
            start: { dateTime: '2026-07-21T10:00:00.000Z' },
            end: { dateTime: '2026-07-21T11:00:00.000Z' },
          },
        ],
        nextSyncToken: 't',
      },
    });

    const result = await service.syncNow('cong-1');
    expect(result.conflicts).toBe(1);
    expect(eventsSave).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Google title' }),
    );
  });
});
