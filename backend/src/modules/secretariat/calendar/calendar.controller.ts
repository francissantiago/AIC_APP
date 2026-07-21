import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiErrorResponses } from '../../../common/decorators/api-error-responses.decorator';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ActiveCongregation } from '../../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CalendarEventResponseDto,
  CreateCalendarEventDto,
  ExportCalendarIcsQueryDto,
  ImportCalendarEventsResponseDto,
  PaginatedCalendarEventsResponseDto,
  QueryCalendarEventsDto,
  UpdateCalendarEventDto,
} from '../dto/secretariat.dto';
import { UploadedFile as SecretariatUploadedFile } from '../storage/uploaded-file.interface';
import { ICS_IMPORT_MAX_BYTES } from './calendar-ics.util';
import { CalendarService } from './calendar.service';

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('secretariat:read')
@Controller('secretariat/calendar-events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos da agenda' })
  @ApiOkResponse({ type: PaginatedCalendarEventsResponseDto })
  findEvents(
    @Query() query: QueryCalendarEventsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedCalendarEventsResponseDto> {
    return this.calendarService.findEvents(query, activeCongregationId);
  }

  @Get('export.ics')
  @ApiOperation({
    summary: 'Exportar agenda em ICS (intervalo)',
    description:
      'Gera um arquivo iCalendar (RFC 5545) com as séries mestres que intersectam o intervalo. Inclui eventos de aniversário geridos pelo sistema. Limite: 500 séries. RRULE suportado: FREQ (DAILY|WEEKLY|MONTHLY|YEARLY), INTERVAL, UNTIL. Não inclui BYDAY/COUNT/EXDATE.',
  })
  @ApiProduces('text/calendar')
  @ApiOkResponse({
    description: 'Arquivo ICS (text/calendar)',
    schema: { type: 'string', format: 'binary' },
  })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async exportRangeIcs(
    @Query() query: ExportCalendarIcsQueryDto,
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const ics = await this.calendarService.exportRangeAsIcs(
      query,
      activeCongregationId,
    );
    const fromDate = query.from.slice(0, 10);
    response
      .setHeader(
        'Content-Disposition',
        `attachment; filename="aic-agenda-${fromDate}.ics"`,
      )
      .send(ics);
  }

  @Post('import.ics')
  @RequirePermission('secretariat:write')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ICS_IMPORT_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data', 'text/calendar', 'text/plain')
  @ApiBody({
    description:
      'Multipart com campo `file` (.ics) ou body raw text/calendar|text/plain. Limite: 1 MB e 100 VEVENTs. RRULE com partes não suportadas (BYDAY, COUNT, etc.) importa como evento único com warning UNSUPPORTED_RRULE_PARTS. Timed sem DTEND assume 1h.',
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['file'],
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'Arquivo .ics (campo multipart: file)',
            },
          },
        },
        {
          type: 'string',
          description: 'Conteúdo ICS bruto (Content-Type: text/calendar)',
        },
      ],
    },
  })
  @ApiOperation({
    summary: 'Importar eventos a partir de arquivo ICS',
    description:
      'Cria eventos na congregação ativa via CreateCalendarEventDto. Resposta parcial: created/skipped/warnings/createdIds. Não persiste UID externo (MVP sem ics_uid).',
  })
  @ApiCreatedResponse({ type: ImportCalendarEventsResponseDto })
  @ApiPayloadTooLargeResponse({ description: 'Arquivo maior que 1 MB' })
  async importIcs(
    @UploadedFile() file: SecretariatUploadedFile | undefined,
    @Body() body: string | Record<string, unknown> | undefined,
    @Req() request: Request,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ImportCalendarEventsResponseDto> {
    const raw = await this.resolveIcsPayload(file, body, request);
    return this.calendarService.importFromIcs(raw, user, activeCongregationId);
  }

  @Get(':id/export.ics')
  @ApiOperation({
    summary: 'Exportar um evento mestre em ICS',
    description:
      'Gera um VEVENT para a série mestre (UUID). Inclui birthday/system se o id existir. UID virtual: {id}@{slug-do-nome-da-congregacao}; PRODID usa o nome da congregação.',
  })
  @ApiProduces('text/calendar')
  @ApiOkResponse({
    description: 'Arquivo ICS (text/calendar) com um VEVENT',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async exportEventIcs(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const ics = await this.calendarService.exportEventAsIcs(
      id,
      activeCongregationId,
    );
    response
      .setHeader(
        'Content-Disposition',
        `attachment; filename="aic-event-${id}.ics"`,
      )
      .send(ics);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar evento da agenda' })
  @ApiOkResponse({ type: CalendarEventResponseDto })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  findEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarService.findEvent(id, activeCongregationId);
  }

  @Post()
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Criar evento na agenda' })
  @ApiCreatedResponse({ type: CalendarEventResponseDto })
  createEvent(
    @Body() dto: CreateCalendarEventDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarService.createEvent(dto, user, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Atualizar evento da agenda' })
  @ApiOkResponse({ type: CalendarEventResponseDto })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarService.updateEvent(id, dto, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('secretariat:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover evento da agenda por soft delete' })
  @ApiNoContentResponse({ description: 'Evento removido' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  removeEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.calendarService.removeEvent(id, activeCongregationId);
  }

  private async resolveIcsPayload(
    file: SecretariatUploadedFile | undefined,
    body: string | Record<string, unknown> | undefined,
    request: Request,
  ): Promise<string> {
    if (file?.buffer?.length) {
      if (file.size > ICS_IMPORT_MAX_BYTES) {
        throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, {
          code: ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE,
          message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE],
        });
      }
      return file.buffer.toString('utf8');
    }

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    const contentType = String(request.headers['content-type'] ?? '');
    if (
      contentType.includes('text/calendar') ||
      contentType.includes('text/plain')
    ) {
      const streamText = await this.readRequestText(request);
      if (streamText.trim()) {
        if (Buffer.byteLength(streamText, 'utf8') > ICS_IMPORT_MAX_BYTES) {
          throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, {
            code: ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE,
            message:
              ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE],
          });
        }
        return streamText;
      }
    }

    throw new ApiException(HttpStatus.BAD_REQUEST, {
      code: ApiErrorCode.SECRETARIAT_ICS_FILE_REQUIRED,
      message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_FILE_REQUIRED],
    });
  }

  private readRequestText(request: Request): Promise<string> {
    if (!request.readable || request.readableEnded || request.complete) {
      return Promise.resolve('');
    }
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let total = 0;
      request.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > ICS_IMPORT_MAX_BYTES) {
          reject(
            new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, {
              code: ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE,
              message:
                ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE],
            }),
          );
          request.destroy();
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      request.on('error', reject);
    });
  }
}
