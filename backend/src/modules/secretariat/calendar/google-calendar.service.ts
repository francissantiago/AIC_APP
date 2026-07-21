import { Injectable } from '@nestjs/common';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  GoogleCalendarConnectionStatusDto,
  GoogleCalendarDisconnectResponseDto,
  GoogleCalendarListResponseDto,
  GoogleCalendarOAuthUrlResponseDto,
  GoogleCalendarSyncResultDto,
  UpdateGoogleCalendarSettingsDto,
} from '../dto/google-calendar.dto';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@Injectable()
export class GoogleCalendarService {
  constructor(
    private readonly oauthService: GoogleCalendarOAuthService,
    private readonly syncService: GoogleCalendarSyncService,
  ) {}

  getStatus(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarConnectionStatusDto> {
    return this.oauthService.getStatus(activeCongregationId);
  }

  getOAuthUrl(
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<GoogleCalendarOAuthUrlResponseDto> {
    return this.oauthService.getOAuthUrl(user, activeCongregationId);
  }

  handleOAuthCallback(
    code: string | undefined,
    state: string | undefined,
    error?: string,
  ): Promise<string> {
    return this.oauthService.handleOAuthCallback(code, state, error);
  }

  disconnect(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarDisconnectResponseDto> {
    return this.oauthService.disconnect(activeCongregationId);
  }

  listCalendars(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarListResponseDto> {
    return this.syncService.listCalendars(activeCongregationId);
  }

  updateSettings(
    dto: UpdateGoogleCalendarSettingsDto,
    activeCongregationId?: string,
  ): Promise<GoogleCalendarConnectionStatusDto> {
    return this.syncService.updateSettings(dto, activeCongregationId);
  }

  syncNow(activeCongregationId?: string): Promise<GoogleCalendarSyncResultDto> {
    return this.syncService.syncNow(activeCongregationId);
  }
}
