import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { calendar_v3, google } from 'googleapis';
import { IsNull, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import {
  GoogleCalendarListResponseDto,
  GoogleCalendarSyncResultDto,
  UpdateGoogleCalendarSettingsDto,
} from '../dto/google-calendar.dto';
import {
  GoogleCalendarConflictPolicy,
  GoogleCalendarConnectionStatus,
  GoogleCalendarSyncDirection,
} from '../enums/secretariat.enums';
import { CalendarEvent } from './entities/calendar-event.entity';
import { GoogleCalendarConnection } from './entities/google-calendar-connection.entity';
import { GoogleCalendarEventLink } from './entities/google-calendar-event-link.entity';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import {
  computeAicContentHash,
  extractAicEventIdFromGoogle,
  mapAicEventToGoogleResource,
  mapGoogleEventToAicFields,
  parseGoogleUpdatedAt,
} from './google-calendar-mapper.util';

@Injectable()
export class GoogleCalendarSyncService {
  private readonly logger = new Logger(GoogleCalendarSyncService.name);
  private readonly syncingCongregations = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly congregationsService: CongregationsService,
    private readonly oauthService: GoogleCalendarOAuthService,
    @InjectRepository(GoogleCalendarConnection)
    private readonly connectionsRepository: Repository<GoogleCalendarConnection>,
    @InjectRepository(GoogleCalendarEventLink)
    private readonly linksRepository: Repository<GoogleCalendarEventLink>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventsRepository: Repository<CalendarEvent>,
  ) {}

  async pushEventBestEffort(
    event: CalendarEvent,
    action: 'upsert' | 'delete',
  ): Promise<void> {
    try {
      await this.pushEvent(event, action);
    } catch (err) {
      this.logger.warn(
        `Push Google Calendar best-effort falhou (${action}/${event.id}): ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
    }
  }

  async pushEvent(
    event: CalendarEvent,
    action: 'upsert' | 'delete',
  ): Promise<void> {
    const connection = await this.oauthService.findActiveConnection(
      event.congregationId,
    );
    if (
      !connection ||
      connection.status !== GoogleCalendarConnectionStatus.ACTIVE
    ) {
      return;
    }
    if (
      connection.syncDirection === GoogleCalendarSyncDirection.GOOGLE_TO_AIC
    ) {
      return;
    }

    const calendar = await this.getCalendarApi(connection);
    const calendarId = connection.googleCalendarId || 'primary';
    const link = await this.linksRepository.findOne({
      where: {
        connectionId: connection.id,
        calendarEventId: event.id,
      },
    });

    if (action === 'delete') {
      if (!link) {
        return;
      }
      try {
        await calendar.events.delete({
          calendarId,
          eventId: link.googleEventId,
        });
      } catch (err) {
        if (!this.isNotFoundError(err)) {
          throw err;
        }
      }
      await this.linksRepository.delete({ id: link.id });
      return;
    }

    const resource = mapAicEventToGoogleResource(event, this.getTimeZone());
    const contentHash = computeAicContentHash(event);

    if (!link) {
      const created = await calendar.events.insert({
        calendarId,
        requestBody: resource,
      });
      if (!created.data.id) {
        throw new Error('Google insert sem id');
      }
      await this.linksRepository.save(
        this.linksRepository.create({
          connectionId: connection.id,
          calendarEventId: event.id,
          googleEventId: created.data.id,
          googleEtag: created.data.etag ?? null,
          lastPushedAt: new Date(),
          contentHash,
        }),
      );
      return;
    }

    if (link.contentHash === contentHash) {
      return;
    }

    try {
      const updated = await calendar.events.patch({
        calendarId,
        eventId: link.googleEventId,
        requestBody: resource,
        ...(link.googleEtag
          ? { headers: { 'If-Match': link.googleEtag } }
          : {}),
      });
      link.googleEtag = updated.data.etag ?? link.googleEtag;
      link.lastPushedAt = new Date();
      link.contentHash = contentHash;
      await this.linksRepository.save(link);
    } catch (err) {
      if (this.isPreconditionFailed(err)) {
        await this.resolvePushConflict(connection, calendar, event, link);
        return;
      }
      throw err;
    }
  }

  async syncNow(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarSyncResultDto> {
    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    const connection = await this.requireActiveConnection(congregationId);

    if (this.syncingCongregations.has(congregationId)) {
      return { pushed: 0, pulled: 0, conflicts: 0, errors: 0, warnings: [] };
    }

    this.syncingCongregations.add(congregationId);
    const result: GoogleCalendarSyncResultDto = {
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: 0,
      warnings: [],
    };

    try {
      const isInitial = !connection.syncToken;
      if (
        connection.syncDirection ===
          GoogleCalendarSyncDirection.BIDIRECTIONAL ||
        connection.syncDirection === GoogleCalendarSyncDirection.AIC_TO_GOOGLE
      ) {
        result.pushed += await this.pushAllActiveEvents(connection);
      }

      if (
        connection.syncDirection ===
          GoogleCalendarSyncDirection.BIDIRECTIONAL ||
        connection.syncDirection === GoogleCalendarSyncDirection.GOOGLE_TO_AIC
      ) {
        const pull = await this.pullIncremental(connection, isInitial);
        result.pulled += pull.pulled;
        result.conflicts += pull.conflicts;
        result.errors += pull.errors;
        result.warnings.push(...pull.warnings);
      }

      connection.lastSyncAt = new Date();
      connection.lastSyncError = null;
      connection.status = GoogleCalendarConnectionStatus.ACTIVE;
      await this.connectionsRepository.save(connection);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'sync_failed';
      connection.lastSyncError = message.slice(0, 2000);
      connection.status = GoogleCalendarConnectionStatus.ERROR;
      await this.connectionsRepository.save(connection);
      throw new ApiException(HttpStatus.BAD_GATEWAY, {
        code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_SYNC_FAILED,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_SYNC_FAILED],
      });
    } finally {
      this.syncingCongregations.delete(congregationId);
    }
  }

  async syncAllActiveConnections(): Promise<void> {
    const connections = await this.connectionsRepository.find({
      where: {
        status: GoogleCalendarConnectionStatus.ACTIVE,
        deletedAt: IsNull(),
      },
    });

    for (const connection of connections) {
      try {
        await this.syncNow(connection.congregationId);
      } catch (err) {
        this.logger.warn(
          `Cron sync falhou para ${connection.congregationId}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }
  }

  async listCalendars(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarListResponseDto> {
    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    const connection = await this.requireActiveConnection(congregationId);
    const auth = await this.oauthService.getAuthorizedClient(connection);
    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.calendarList.list({ maxResults: 100 });
    return {
      items: (response.data.items ?? []).map((item) => ({
        id: item.id ?? '',
        summary: item.summary ?? item.id ?? 'Calendar',
        primary: Boolean(item.primary),
        accessRole: item.accessRole ?? null,
      })),
    };
  }

  async updateSettings(
    dto: UpdateGoogleCalendarSettingsDto,
    activeCongregationId?: string,
  ) {
    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    const connection = await this.requireActiveConnection(congregationId);

    if (dto.googleCalendarId !== undefined) {
      const next = dto.googleCalendarId.trim();
      if (next && next !== connection.googleCalendarId) {
        connection.googleCalendarId = next;
        connection.syncToken = null;
      }
    }
    if (dto.syncDirection !== undefined) {
      connection.syncDirection = dto.syncDirection;
    }
    if (dto.conflictPolicy !== undefined) {
      connection.conflictPolicy = dto.conflictPolicy;
    }

    await this.connectionsRepository.save(connection);
    return this.oauthService.getStatus(congregationId);
  }

  private async pushAllActiveEvents(
    connection: GoogleCalendarConnection,
  ): Promise<number> {
    const events = await this.calendarEventsRepository.find({
      where: {
        congregationId: connection.congregationId,
        deletedAt: IsNull(),
      },
    });
    let pushed = 0;
    for (const event of events) {
      try {
        await this.pushEvent(event, 'upsert');
        pushed += 1;
      } catch (err) {
        this.logger.warn(
          `Push batch falhou para ${event.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }
    return pushed;
  }

  private async pullIncremental(
    connection: GoogleCalendarConnection,
    forceWindow: boolean,
  ): Promise<{
    pulled: number;
    conflicts: number;
    errors: number;
    warnings: string[];
  }> {
    const calendar = await this.getCalendarApi(connection);
    const calendarId = connection.googleCalendarId || 'primary';
    let pageToken: string | undefined;
    let syncToken = forceWindow
      ? undefined
      : (connection.syncToken ?? undefined);
    let pulled = 0;
    let conflicts = 0;
    let errors = 0;
    const warnings: string[] = [];

    const window = this.buildPullWindow();
    let hasMorePages = true;

    while (hasMorePages) {
      let response: { data: calendar_v3.Schema$Events };
      try {
        response = await calendar.events.list({
          calendarId,
          singleEvents: false,
          showDeleted: true,
          maxResults: 250,
          pageToken,
          syncToken,
          ...(syncToken
            ? {}
            : {
                timeMin: window.timeMin,
                timeMax: window.timeMax,
              }),
        });
      } catch (err) {
        if (this.isGoneError(err) && syncToken) {
          connection.syncToken = null;
          await this.connectionsRepository.save(connection);
          syncToken = undefined;
          pageToken = undefined;
          continue;
        }
        throw err;
      }

      for (const item of response.data.items ?? []) {
        try {
          const outcome = await this.applyPulledEvent(connection, item);
          if (outcome === 'pulled') pulled += 1;
          if (outcome === 'conflict') conflicts += 1;
          if (outcome === 'warning') {
            warnings.push(`UNSUPPORTED_RRULE_PARTS:${item.id ?? 'unknown'}`);
          }
        } catch (err) {
          errors += 1;
          this.logger.warn(
            `Pull item falhou: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
      if (!pageToken) {
        if (response.data.nextSyncToken) {
          connection.syncToken = response.data.nextSyncToken;
          await this.connectionsRepository.save(connection);
        }
        hasMorePages = false;
      }
    }

    return { pulled, conflicts, errors, warnings };
  }

  private async applyPulledEvent(
    connection: GoogleCalendarConnection,
    googleEvent: calendar_v3.Schema$Event,
  ): Promise<'pulled' | 'conflict' | 'warning' | 'noop'> {
    if (!googleEvent.id) {
      return 'noop';
    }

    const linkByGoogle = await this.linksRepository.findOne({
      where: {
        connectionId: connection.id,
        googleEventId: googleEvent.id,
      },
    });

    const aicEventId = extractAicEventIdFromGoogle(googleEvent);
    let link = linkByGoogle;
    if (!link && aicEventId) {
      link = await this.linksRepository.findOne({
        where: {
          connectionId: connection.id,
          calendarEventId: aicEventId,
        },
      });
    }

    if (googleEvent.status === 'cancelled') {
      if (!link) {
        return 'noop';
      }
      const event = await this.calendarEventsRepository.findOne({
        where: { id: link.calendarEventId },
        withDeleted: true,
      });
      if (event && !event.deletedAt) {
        // Birthday soft-delete is allowed for the calendar event only (not member).
        await this.calendarEventsRepository.softRemove(event);
      }
      await this.linksRepository.delete({ id: link.id });
      return 'pulled';
    }

    const mapped = mapGoogleEventToAicFields(googleEvent);
    const hasWarning = mapped.warnings.length > 0;

    if (!link) {
      const existingByExtended = aicEventId
        ? await this.calendarEventsRepository.findOne({
            where: {
              id: aicEventId,
              congregationId: connection.congregationId,
            },
          })
        : null;

      if (existingByExtended) {
        await this.linksRepository.save(
          this.linksRepository.create({
            connectionId: connection.id,
            calendarEventId: existingByExtended.id,
            googleEventId: googleEvent.id,
            googleEtag: googleEvent.etag ?? null,
            lastPulledAt: new Date(),
            contentHash: computeAicContentHash(existingByExtended),
          }),
        );
        return hasWarning ? 'warning' : 'pulled';
      }

      const created = this.calendarEventsRepository.create({
        congregationId: connection.congregationId,
        createdByUserId: connection.connectedByUserId,
        title: mapped.fields.title,
        type: mapped.fields.type,
        startsAt: mapped.fields.startsAt,
        endsAt: mapped.fields.endsAt,
        allDay: mapped.fields.allDay,
        location: mapped.fields.location,
        description: mapped.fields.description,
        recurrenceFrequency: mapped.fields.recurrenceFrequency,
        recurrenceInterval: mapped.fields.recurrenceInterval,
        recurrenceUntil: mapped.fields.recurrenceUntil,
      });
      const saved = await this.calendarEventsRepository.save(created);
      await this.linksRepository.save(
        this.linksRepository.create({
          connectionId: connection.id,
          calendarEventId: saved.id,
          googleEventId: googleEvent.id,
          googleEtag: googleEvent.etag ?? null,
          lastPulledAt: new Date(),
          contentHash: computeAicContentHash(saved),
        }),
      );
      return hasWarning ? 'warning' : 'pulled';
    }

    const event = await this.calendarEventsRepository.findOne({
      where: { id: link.calendarEventId },
    });
    if (!event) {
      await this.linksRepository.delete({ id: link.id });
      return 'noop';
    }

    const googleUpdated = parseGoogleUpdatedAt(googleEvent);
    const shouldApplyGoogle = this.shouldApplyGoogleSide(
      connection.conflictPolicy,
      event.updatedAt,
      googleUpdated,
    );

    if (!shouldApplyGoogle) {
      return 'conflict';
    }

    event.title = mapped.fields.title;
    event.description = mapped.fields.description;
    event.location = mapped.fields.location;
    event.startsAt = mapped.fields.startsAt;
    event.endsAt = mapped.fields.endsAt;
    event.allDay = mapped.fields.allDay;
    if (!event.sourceMemberId) {
      event.type = mapped.fields.type;
    }
    event.recurrenceFrequency = mapped.fields.recurrenceFrequency;
    event.recurrenceInterval = mapped.fields.recurrenceInterval;
    event.recurrenceUntil = mapped.fields.recurrenceUntil;
    const saved = await this.calendarEventsRepository.save(event);

    link.googleEtag = googleEvent.etag ?? link.googleEtag;
    link.lastPulledAt = new Date();
    link.contentHash = computeAicContentHash(saved);
    if (link.googleEventId !== googleEvent.id) {
      link.googleEventId = googleEvent.id;
    }
    await this.linksRepository.save(link);

    return hasWarning ? 'warning' : 'pulled';
  }

  private shouldApplyGoogleSide(
    policy: GoogleCalendarConflictPolicy,
    aicUpdatedAt: Date,
    googleUpdatedAt: Date | null,
  ): boolean {
    if (policy === GoogleCalendarConflictPolicy.GOOGLE_WINS) {
      return true;
    }
    if (policy === GoogleCalendarConflictPolicy.AIC_WINS) {
      return false;
    }
    if (!googleUpdatedAt) {
      return true;
    }
    return googleUpdatedAt.getTime() >= aicUpdatedAt.getTime();
  }

  private async resolvePushConflict(
    connection: GoogleCalendarConnection,
    calendar: calendar_v3.Calendar,
    event: CalendarEvent,
    link: GoogleCalendarEventLink,
  ): Promise<void> {
    const remote = await calendar.events.get({
      calendarId: connection.googleCalendarId || 'primary',
      eventId: link.googleEventId,
    });
    const googleUpdated = parseGoogleUpdatedAt(remote.data);
    const applyGoogle = this.shouldApplyGoogleSide(
      connection.conflictPolicy,
      event.updatedAt,
      googleUpdated,
    );

    if (applyGoogle && remote.data) {
      await this.applyPulledEvent(connection, remote.data);
      return;
    }

    const resource = mapAicEventToGoogleResource(event, this.getTimeZone());
    const updated = await calendar.events.patch({
      calendarId: connection.googleCalendarId || 'primary',
      eventId: link.googleEventId,
      requestBody: resource,
    });
    link.googleEtag = updated.data.etag ?? null;
    link.lastPushedAt = new Date();
    link.contentHash = computeAicContentHash(event);
    await this.linksRepository.save(link);
  }

  private async getCalendarApi(connection: GoogleCalendarConnection) {
    const auth = await this.oauthService.getAuthorizedClient(connection);
    return google.calendar({ version: 'v3', auth });
  }

  private async requireActiveConnection(
    congregationId: string,
  ): Promise<GoogleCalendarConnection> {
    const connection =
      await this.oauthService.findActiveConnection(congregationId);
    if (
      !connection ||
      connection.status === GoogleCalendarConnectionStatus.DISCONNECTED
    ) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_NOT_CONNECTED,
        message:
          ApiErrorMessage[
            ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_NOT_CONNECTED
          ],
      });
    }
    if (
      connection.status === GoogleCalendarConnectionStatus.REVOKED ||
      connection.status === GoogleCalendarConnectionStatus.ERROR
    ) {
      // Still allow status/settings; sync may fail — but require reconnect for sync.
      if (connection.status === GoogleCalendarConnectionStatus.REVOKED) {
        throw new ApiException(HttpStatus.BAD_GATEWAY, {
          code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_OAUTH_FAILED,
          message:
            ApiErrorMessage[
              ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_OAUTH_FAILED
            ],
        });
      }
    }
    return connection;
  }

  private buildPullWindow(): { timeMin: string; timeMax: string } {
    const now = new Date();
    const timeMin = new Date(now);
    timeMin.setMonth(timeMin.getMonth() - 6);
    const timeMax = new Date(now);
    timeMax.setMonth(timeMax.getMonth() + 12);
    return {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    };
  }

  private getTimeZone(): string {
    return (
      this.configService.get<string>('APP_TIMEZONE') ?? 'America/Sao_Paulo'
    );
  }

  private async resolveCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private isNotFoundError(err: unknown): boolean {
    return this.getErrorCode(err) === 404;
  }

  private isGoneError(err: unknown): boolean {
    return this.getErrorCode(err) === 410;
  }

  private isPreconditionFailed(err: unknown): boolean {
    return this.getErrorCode(err) === 412;
  }

  private getErrorCode(err: unknown): number | null {
    if (!err || typeof err !== 'object') {
      return null;
    }
    const maybe = err as { code?: number; response?: { status?: number } };
    return maybe.code ?? maybe.response?.status ?? null;
  }
}
