import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { google } from 'googleapis';
import { IsNull, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  GoogleCalendarConnectionStatusDto,
  GoogleCalendarDisconnectResponseDto,
  GoogleCalendarOAuthUrlResponseDto,
} from '../dto/google-calendar.dto';
import { GoogleCalendarConnectionStatus } from '../enums/secretariat.enums';
import { GoogleCalendarConnection } from './entities/google-calendar-connection.entity';
import { GoogleCalendarEventLink } from './entities/google-calendar-event-link.entity';
import { decryptSecret, encryptSecret } from './google-calendar-crypto.util';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

const STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_SKEW_MS = 60_000;

interface OAuthStatePayload {
  congregationId: string;
  userId: string;
  nonce: string;
  exp: number;
}

@Injectable()
export class GoogleCalendarOAuthService {
  private readonly logger = new Logger(GoogleCalendarOAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly congregationsService: CongregationsService,
    @InjectRepository(GoogleCalendarConnection)
    private readonly connectionsRepository: Repository<GoogleCalendarConnection>,
    @InjectRepository(GoogleCalendarEventLink)
    private readonly linksRepository: Repository<GoogleCalendarEventLink>,
  ) {}

  getOAuthUrl(
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<GoogleCalendarOAuthUrlResponseDto> {
    return this.buildOAuthUrl(user, activeCongregationId);
  }

  async buildOAuthUrl(
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<GoogleCalendarOAuthUrlResponseDto> {
    this.assertConfigured();
    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    const existing = await this.findActiveConnection(congregationId);
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_ALREADY_CONNECTED,
        message:
          ApiErrorMessage[
            ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_ALREADY_CONNECTED
          ],
      });
    }

    const state = this.signState({
      congregationId,
      userId: user.id,
      nonce: randomBytes(16).toString('hex'),
      exp: Date.now() + STATE_TTL_MS,
    });

    const client = this.createOAuthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state,
      include_granted_scopes: true,
    });

    return { url, state };
  }

  async handleOAuthCallback(
    code: string | undefined,
    state: string | undefined,
    error?: string,
  ): Promise<string> {
    const frontendBase = (
      this.configService.get<string>('FRONTEND_APP_URL') ??
      'http://localhost:4200'
    ).replace(/\/$/, '');

    const redirect = (status: 'connected' | 'error') =>
      `${frontendBase}/secretariat/agenda?googleCalendar=${status}`;

    try {
      this.assertConfigured();
      if (error || !code || !state) {
        throw new Error(error || 'missing_code_or_state');
      }

      const payload = this.verifyState(state);
      const client = this.createOAuthClient();
      const { tokens } = await client.getToken(code);
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('missing_tokens');
      }

      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const profile = await oauth2.userinfo.get();
      const email = profile.data.email;
      if (!email) {
        throw new Error('missing_email');
      }

      const encryptionKey = this.getEncryptionKey();
      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600_000);

      const softDeleted = await this.connectionsRepository.findOne({
        where: { congregationId: payload.congregationId },
        withDeleted: true,
      });

      if (softDeleted?.deletedAt) {
        softDeleted.connectedByUserId = payload.userId;
        softDeleted.googleAccountEmail = email;
        softDeleted.googleCalendarId = 'primary';
        softDeleted.accessTokenEncrypted = encryptSecret(
          tokens.access_token,
          encryptionKey,
        );
        softDeleted.refreshTokenEncrypted = encryptSecret(
          tokens.refresh_token,
          encryptionKey,
        );
        softDeleted.tokenExpiresAt = expiresAt;
        softDeleted.scopes = (tokens.scope || GOOGLE_SCOPES.join(' ')).slice(
          0,
          500,
        );
        softDeleted.syncToken = null;
        softDeleted.status = GoogleCalendarConnectionStatus.ACTIVE;
        softDeleted.lastSyncAt = null;
        softDeleted.lastSyncError = null;
        softDeleted.deletedAt = null;
        await this.connectionsRepository.save(softDeleted);
      } else if (softDeleted && !softDeleted.deletedAt) {
        throw new Error('already_connected');
      } else {
        const connection = this.connectionsRepository.create({
          congregationId: payload.congregationId,
          connectedByUserId: payload.userId,
          googleAccountEmail: email,
          googleCalendarId: 'primary',
          accessTokenEncrypted: encryptSecret(
            tokens.access_token,
            encryptionKey,
          ),
          refreshTokenEncrypted: encryptSecret(
            tokens.refresh_token,
            encryptionKey,
          ),
          tokenExpiresAt: expiresAt,
          scopes: (tokens.scope || GOOGLE_SCOPES.join(' ')).slice(0, 500),
          syncToken: null,
          status: GoogleCalendarConnectionStatus.ACTIVE,
        });
        await this.connectionsRepository.save(connection);
      }

      this.logger.log(
        `Google Calendar conectado para congregação ${payload.congregationId}`,
      );
      return redirect('connected');
    } catch (err) {
      this.logger.warn(
        `OAuth Google Calendar falhou: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return redirect('error');
    }
  }

  async getStatus(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarConnectionStatusDto> {
    if (!this.isConfigured()) {
      return this.emptyStatus(false);
    }

    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    const connection = await this.findActiveConnection(congregationId);
    if (!connection) {
      return this.emptyStatus(true);
    }

    return {
      configured: true,
      connected: connection.status === GoogleCalendarConnectionStatus.ACTIVE,
      status: connection.status,
      email: this.maskEmail(connection.googleAccountEmail),
      googleCalendarId: connection.googleCalendarId,
      syncDirection: connection.syncDirection,
      conflictPolicy: connection.conflictPolicy,
      lastSyncAt: connection.lastSyncAt
        ? connection.lastSyncAt.toISOString()
        : null,
      lastSyncError: connection.lastSyncError,
    };
  }

  async disconnect(
    activeCongregationId?: string,
  ): Promise<GoogleCalendarDisconnectResponseDto> {
    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    const connection = await this.findActiveConnection(congregationId);
    if (!connection) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_NOT_CONNECTED,
        message:
          ApiErrorMessage[
            ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_NOT_CONNECTED
          ],
      });
    }

    try {
      const client = await this.getAuthorizedClient(connection);
      await client.revokeCredentials();
    } catch (err) {
      this.logger.warn(
        `Revogação Google best-effort falhou: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    await this.linksRepository.delete({ connectionId: connection.id });
    connection.status = GoogleCalendarConnectionStatus.DISCONNECTED;
    connection.syncToken = null;
    connection.lastSyncError = null;
    await this.connectionsRepository.save(connection);
    await this.connectionsRepository.softRemove(connection);

    return { disconnected: true };
  }

  async getAuthorizedClient(connection: GoogleCalendarConnection) {
    this.assertConfigured();
    const encryptionKey = this.getEncryptionKey();
    const client = this.createOAuthClient();
    let accessToken = decryptSecret(
      connection.accessTokenEncrypted,
      encryptionKey,
    );
    const refreshToken = decryptSecret(
      connection.refreshTokenEncrypted,
      encryptionKey,
    );

    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.tokenExpiresAt.getTime(),
    });

    if (connection.tokenExpiresAt.getTime() <= Date.now() + TOKEN_SKEW_MS) {
      try {
        const { credentials } = await client.refreshAccessToken();
        if (credentials.access_token) {
          accessToken = credentials.access_token;
          connection.accessTokenEncrypted = encryptSecret(
            credentials.access_token,
            encryptionKey,
          );
        }
        if (credentials.refresh_token) {
          connection.refreshTokenEncrypted = encryptSecret(
            credentials.refresh_token,
            encryptionKey,
          );
        }
        if (credentials.expiry_date) {
          connection.tokenExpiresAt = new Date(credentials.expiry_date);
        }
        connection.status = GoogleCalendarConnectionStatus.ACTIVE;
        await this.connectionsRepository.save(connection);
        client.setCredentials({
          access_token: accessToken,
          refresh_token: decryptSecret(
            connection.refreshTokenEncrypted,
            encryptionKey,
          ),
          expiry_date: connection.tokenExpiresAt.getTime(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'refresh_failed';
        connection.status =
          message.includes('invalid_grant') || message.includes('revoked')
            ? GoogleCalendarConnectionStatus.REVOKED
            : GoogleCalendarConnectionStatus.ERROR;
        connection.syncToken = null;
        connection.lastSyncError = 'Token Google inválido ou revogado';
        await this.connectionsRepository.save(connection);
        throw new ApiException(HttpStatus.BAD_GATEWAY, {
          code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_OAUTH_FAILED,
          message:
            ApiErrorMessage[
              ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_OAUTH_FAILED
            ],
        });
      }
    }

    return client;
  }

  signState(payload: OAuthStatePayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.getStateSecret())
      .update(body)
      .digest('base64url');
    return `${body}.${signature}`;
  }

  verifyState(state: string): OAuthStatePayload {
    const [body, signature] = state.split('.');
    if (!body || !signature) {
      throw new Error('invalid_state');
    }
    const expected = createHmac('sha256', this.getStateSecret())
      .update(body)
      .digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new Error('invalid_state_signature');
    }
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as OAuthStatePayload;
    if (!payload.exp || payload.exp < Date.now()) {
      throw new Error('state_expired');
    }
    if (!payload.congregationId || !payload.userId || !payload.nonce) {
      throw new Error('invalid_state_payload');
    }
    return payload;
  }

  async findActiveConnection(
    congregationId: string,
  ): Promise<GoogleCalendarConnection | null> {
    return this.connectionsRepository.findOne({
      where: {
        congregationId,
        deletedAt: IsNull(),
      },
    });
  }

  isConfigured(): boolean {
    const clientId = this.configService
      .get<string>('GOOGLE_OAUTH_CLIENT_ID')
      ?.trim();
    const clientSecret = this.configService
      .get<string>('GOOGLE_OAUTH_CLIENT_SECRET')
      ?.trim();
    const redirectUri = this.configService
      .get<string>('GOOGLE_OAUTH_REDIRECT_URI')
      ?.trim();
    const encryptionKey = this.configService
      .get<string>('GOOGLE_TOKEN_ENCRYPTION_KEY')
      ?.trim();
    return Boolean(clientId && clientSecret && redirectUri && encryptionKey);
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, {
        code: ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_NOT_CONFIGURED,
        message:
          ApiErrorMessage[
            ApiErrorCode.SECRETARIAT_GOOGLE_CALENDAR_NOT_CONFIGURED
          ],
      });
    }
  }

  private emptyStatus(configured: boolean): GoogleCalendarConnectionStatusDto {
    return {
      configured,
      connected: false,
      status: null,
      email: null,
      googleCalendarId: null,
      syncDirection: null,
      conflictPolicy: null,
      lastSyncAt: null,
      lastSyncError: null,
    };
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI'),
    );
  }

  private getEncryptionKey(): string {
    return this.configService.getOrThrow<string>('GOOGLE_TOKEN_ENCRYPTION_KEY');
  }

  private getStateSecret(): string {
    return (
      this.configService.get<string>('GOOGLE_TOKEN_ENCRYPTION_KEY') ||
      this.configService.getOrThrow<string>('JWT_SECRET')
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

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) {
      return '***';
    }
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
}
