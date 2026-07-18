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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { BulkUpsertAssignmentsDto } from './dto/bulk-upsert-assignments.dto';
import { CreateScheduleAssignmentDto } from './dto/create-schedule-assignment.dto';
import { QueryScheduleMemberOptionsDto } from './dto/query-member-options.dto';
import { QueryScheduleAssignmentsDto } from './dto/query-schedule-assignments.dto';
import { QueryWeekViewDto } from './dto/query-week-view.dto';
import {
  PaginatedScheduleAssignmentsResponseDto,
  ScheduleAssignmentResponseDto,
  ScheduleMemberOptionDto,
} from './dto/schedule-assignment-response.dto';
import { UpdateScheduleAssignmentDto } from './dto/update-schedule-assignment.dto';
import { WeekViewResponseDto } from './dto/week-view-response.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('schedules:read')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('assignments')
  @ApiOperation({
    summary: 'Listar atribuições de escala (paginado, com filtros)',
  })
  @ApiOkResponse({ type: PaginatedScheduleAssignmentsResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Período inválido' })
  findAll(
    @Query() query: QueryScheduleAssignmentsDto,
  ): Promise<PaginatedScheduleAssignmentsResponseDto> {
    return this.schedulesService.findAll(query);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Detalhe de uma atribuição de escala' })
  @ApiOkResponse({ type: ScheduleAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Atribuição não encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScheduleAssignmentResponseDto> {
    return this.schedulesService.findOne(id);
  }

  @Post('assignments')
  @RequirePermission('schedules:write')
  @ApiOperation({ summary: 'Criar atribuição de escala' })
  @ApiCreatedResponse({ type: ScheduleAssignmentResponseDto })
  @ApiConflictResponse({ description: 'Atribuição duplicada' })
  @ApiNotFoundResponse({ description: 'Evento, ministério ou membro inválido' })
  @ApiUnprocessableEntityResponse({
    description: 'Regras de negócio violadas',
  })
  create(
    @Body() dto: CreateScheduleAssignmentDto,
  ): Promise<ScheduleAssignmentResponseDto> {
    return this.schedulesService.create(dto);
  }

  @Patch('assignments/:id')
  @RequirePermission('schedules:write')
  @ApiOperation({ summary: 'Atualizar atribuição de escala' })
  @ApiOkResponse({ type: ScheduleAssignmentResponseDto })
  @ApiConflictResponse({ description: 'Atribuição duplicada' })
  @ApiNotFoundResponse({ description: 'Atribuição não encontrada' })
  @ApiUnprocessableEntityResponse({
    description: 'Regras de negócio violadas',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleAssignmentDto,
  ): Promise<ScheduleAssignmentResponseDto> {
    return this.schedulesService.update(id, dto);
  }

  @Delete('assignments/:id')
  @RequirePermission('schedules:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover atribuição de escala (hard delete)' })
  @ApiNoContentResponse({ description: 'Atribuição removida' })
  @ApiNotFoundResponse({ description: 'Atribuição não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.schedulesService.remove(id);
  }

  @Get('week')
  @ApiOperation({
    summary: 'Visão semanal: eventos no intervalo com atribuições aninhadas',
  })
  @ApiOkResponse({ type: WeekViewResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Período inválido' })
  weekView(@Query() query: QueryWeekViewDto): Promise<WeekViewResponseDto> {
    return this.schedulesService.getWeekView(query);
  }

  @Get('events/:calendarEventId/assignments')
  @ApiOperation({ summary: 'Listar escala completa de um evento' })
  @ApiOkResponse({ type: ScheduleAssignmentResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  findByEvent(
    @Param('calendarEventId', ParseUUIDPipe) calendarEventId: string,
  ): Promise<ScheduleAssignmentResponseDto[]> {
    return this.schedulesService.findByEvent(calendarEventId);
  }

  @Put('events/:calendarEventId/ministries/:ministryId/assignments')
  @RequirePermission('schedules:write')
  @ApiOperation({
    summary: 'Substituir lote de atribuições do par evento+ministério',
  })
  @ApiOkResponse({ type: ScheduleAssignmentResponseDto, isArray: true })
  @ApiConflictResponse({ description: 'Conflito de atribuição' })
  @ApiNotFoundResponse({ description: 'Evento ou ministério inválido' })
  @ApiUnprocessableEntityResponse({
    description: 'Regras de negócio violadas',
  })
  bulkUpsert(
    @Param('calendarEventId', ParseUUIDPipe) calendarEventId: string,
    @Param('ministryId', ParseUUIDPipe) ministryId: string,
    @Body() dto: BulkUpsertAssignmentsDto,
  ): Promise<ScheduleAssignmentResponseDto[]> {
    return this.schedulesService.bulkUpsert(calendarEventId, ministryId, dto);
  }

  @Get('member-options')
  @ApiOperation({
    summary: 'Opções de membros ativos vinculados ao ministério',
  })
  @ApiOkResponse({ type: ScheduleMemberOptionDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Ministério não encontrado' })
  memberOptions(
    @Query() query: QueryScheduleMemberOptionsDto,
  ): Promise<ScheduleMemberOptionDto[]> {
    return this.schedulesService.listMemberOptions(query);
  }
}
