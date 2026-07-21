import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponses } from '../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ActiveCongregation } from '../../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  GoogleCalendarConnectionStatusDto,
  GoogleCalendarDisconnectResponseDto,
  GoogleCalendarListResponseDto,
  GoogleCalendarOAuthUrlResponseDto,
  GoogleCalendarSyncResultDto,
  UpdateGoogleCalendarSettingsDto,
} from '../dto/google-calendar.dto';
import { GoogleCalendarService } from './google-calendar.service';

@ApiTags('Secretariat / Google Calendar')
@ApiErrorResponses()
@Controller('secretariat/google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('oauth/callback')
  @ApiOperation({
    summary: 'Callback OAuth Google Calendar',
    description:
      'Endpoint público. Valida state assinado, troca o code por tokens e redireciona ao frontend.',
  })
  @ApiOkResponse({ description: 'Redirect para o frontend' })
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const redirectUrl = await this.googleCalendarService.handleOAuthCallback(
      code,
      state,
      error,
    );
    response.redirect(redirectUrl);
  }

  @Get('status')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão' })
  @UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
  @RequirePermission('secretariat:read')
  @ApiOperation({ summary: 'Status da conexão Google Calendar' })
  @ApiOkResponse({ type: GoogleCalendarConnectionStatusDto })
  getStatus(
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<GoogleCalendarConnectionStatusDto> {
    return this.googleCalendarService.getStatus(activeCongregationId);
  }

  @Get('oauth/url')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão' })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Gerar URL de consentimento OAuth Google' })
  @ApiOkResponse({ type: GoogleCalendarOAuthUrlResponseDto })
  getOAuthUrl(
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<GoogleCalendarOAuthUrlResponseDto> {
    return this.googleCalendarService.getOAuthUrl(user, activeCongregationId);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão' })
  @UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Desconectar Google Calendar' })
  @ApiOkResponse({ type: GoogleCalendarDisconnectResponseDto })
  disconnect(
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<GoogleCalendarDisconnectResponseDto> {
    return this.googleCalendarService.disconnect(activeCongregationId);
  }

  @Get('calendars')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão' })
  @UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Listar calendários Google da conta conectada' })
  @ApiOkResponse({ type: GoogleCalendarListResponseDto })
  listCalendars(
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<GoogleCalendarListResponseDto> {
    return this.googleCalendarService.listCalendars(activeCongregationId);
  }

  @Patch('settings')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão' })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Atualizar preferências de sincronização' })
  @ApiOkResponse({ type: GoogleCalendarConnectionStatusDto })
  updateSettings(
    @Body() dto: UpdateGoogleCalendarSettingsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<GoogleCalendarConnectionStatusDto> {
    return this.googleCalendarService.updateSettings(dto, activeCongregationId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({ description: 'Perfil sem permissão' })
  @UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Disparar sincronização Google Calendar agora' })
  @ApiOkResponse({ type: GoogleCalendarSyncResultDto })
  syncNow(
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<GoogleCalendarSyncResultDto> {
    return this.googleCalendarService.syncNow(activeCongregationId);
  }
}
