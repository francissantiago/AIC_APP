import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ActiveCongregation } from '../../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { CalendarService } from './calendar.service';
import {
  CalendarEventResponseDto,
  CreateCalendarEventDto,
  PaginatedCalendarEventsResponseDto,
  QueryCalendarEventsDto,
  UpdateCalendarEventDto,
} from '../dto/secretariat.dto';

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
}
