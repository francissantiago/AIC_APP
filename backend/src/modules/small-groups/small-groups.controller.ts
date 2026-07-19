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
  Put,
  Query,
  Res,
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
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { AddSmallGroupMemberDto } from './dto/add-small-group-member.dto';
import { CreateSmallGroupMeetingDto } from './dto/create-small-group-meeting.dto';
import { CreateSmallGroupDto } from './dto/create-small-group.dto';
import { QueryLeaderOptionsDto } from './dto/query-leader-options.dto';
import { QueryMemberOptionsDto } from './dto/query-member-options.dto';
import { QuerySmallGroupFrequencyDto } from './dto/query-small-group-frequency.dto';
import { QuerySmallGroupMeetingsDto } from './dto/query-small-group-meetings.dto';
import { QuerySmallGroupMembersDto } from './dto/query-small-group-members.dto';
import { QuerySmallGroupsDto } from './dto/query-small-groups.dto';
import { SmallGroupMeetingAttendanceDto } from './dto/small-group-attendance-response.dto';
import { SmallGroupFrequencyReportDto } from './dto/small-group-frequency-response.dto';
import {
  PaginatedSmallGroupMeetingsResponseDto,
  SmallGroupMeetingResponseDto,
} from './dto/small-group-meeting-response.dto';
import {
  PaginatedSmallGroupMembersResponseDto,
  SmallGroupMemberOptionDto,
  SmallGroupMemberResponseDto,
} from './dto/small-group-member-response.dto';
import {
  PaginatedSmallGroupsResponseDto,
  SmallGroupLeaderOptionDto,
  SmallGroupResponseDto,
} from './dto/small-group-response.dto';
import { UpdateSmallGroupMeetingDto } from './dto/update-small-group-meeting.dto';
import { UpdateSmallGroupMemberDto } from './dto/update-small-group-member.dto';
import { UpdateSmallGroupDto } from './dto/update-small-group.dto';
import { UpsertSmallGroupAttendanceDto } from './dto/upsert-small-group-attendance.dto';
import { SmallGroupsService } from './small-groups.service';

@ApiTags('small-groups')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('small-groups:read')
@Controller('small-groups')
export class SmallGroupsController {
  constructor(private readonly smallGroupsService: SmallGroupsService) {}

  @Post()
  @RequirePermission('small-groups:write')
  @ApiOperation({ summary: 'Criar pequeno grupo' })
  @ApiCreatedResponse({ type: SmallGroupResponseDto })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Líder inválido, inativo ou de outra congregação',
  })
  create(
    @Body() dto: CreateSmallGroupDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupResponseDto> {
    return this.smallGroupsService.create(dto, activeCongregationId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar pequenos grupos (paginado, com filtros)',
  })
  @ApiOkResponse({ type: PaginatedSmallGroupsResponseDto })
  findAll(
    @Query() query: QuerySmallGroupsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSmallGroupsResponseDto> {
    return this.smallGroupsService.findAll(query, activeCongregationId);
  }

  @Get('leader-options')
  @ApiOperation({
    summary: 'Opções de líder (membros ativos da congregação)',
  })
  @ApiOkResponse({ type: SmallGroupLeaderOptionDto, isArray: true })
  leaderOptions(
    @Query() query: QueryLeaderOptionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupLeaderOptionDto[]> {
    return this.smallGroupsService.listLeaderOptions(
      query,
      activeCongregationId,
    );
  }

  @Get(':id/member-options')
  @ApiOperation({
    summary:
      'Opções de membro para vínculo (ativos da congregação ainda não vinculados)',
  })
  @ApiOkResponse({ type: SmallGroupMemberOptionDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  memberOptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMemberOptionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMemberOptionDto[]> {
    return this.smallGroupsService.listMemberOptions(
      id,
      query,
      activeCongregationId,
    );
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Listar membros do pequeno grupo' })
  @ApiOkResponse({ type: PaginatedSmallGroupMembersResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySmallGroupMembersDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSmallGroupMembersResponseDto> {
    return this.smallGroupsService.findMembers(id, query, activeCongregationId);
  }

  @Post(':id/members')
  @RequirePermission('small-groups:write')
  @ApiOperation({ summary: 'Vincular membro ao pequeno grupo' })
  @ApiCreatedResponse({ type: SmallGroupMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo ou membro não encontrado' })
  @ApiConflictResponse({ description: 'Membro já vinculado' })
  @ApiUnprocessableEntityResponse({
    description: 'Membro inativo ou de outra congregação',
  })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSmallGroupMemberDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMemberResponseDto> {
    return this.smallGroupsService.addMember(id, dto, activeCongregationId);
  }

  @Patch(':id/members/:memberId')
  @RequirePermission('small-groups:write')
  @ApiOperation({ summary: 'Atualizar papel/status do membro no grupo' })
  @ApiOkResponse({ type: SmallGroupMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateSmallGroupMemberDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMemberResponseDto> {
    return this.smallGroupsService.updateMember(
      id,
      memberId,
      dto,
      activeCongregationId,
    );
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('small-groups:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincular membro do pequeno grupo' })
  @ApiNoContentResponse({ description: 'Vínculo removido' })
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.smallGroupsService.removeMember(
      id,
      memberId,
      activeCongregationId,
    );
  }

  @Get(':id/meetings')
  @ApiOperation({ summary: 'Listar reuniões do pequeno grupo' })
  @ApiOkResponse({ type: PaginatedSmallGroupMeetingsResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  findMeetings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySmallGroupMeetingsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSmallGroupMeetingsResponseDto> {
    return this.smallGroupsService.findMeetings(
      id,
      query,
      activeCongregationId,
    );
  }

  @Post(':id/meetings')
  @RequirePermission('small-groups:write')
  @ApiOperation({ summary: 'Criar reunião do pequeno grupo' })
  @ApiCreatedResponse({ type: SmallGroupMeetingResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  @ApiConflictResponse({ description: 'Data de reunião já utilizada' })
  @ApiUnprocessableEntityResponse({
    description: 'Grupo inativo não aceita novas reuniões',
  })
  createMeeting(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSmallGroupMeetingDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMeetingResponseDto> {
    return this.smallGroupsService.createMeeting(id, dto, activeCongregationId);
  }

  @Patch(':id/meetings/:meetingId')
  @RequirePermission('small-groups:write')
  @ApiOperation({ summary: 'Atualizar reunião (data/tema/notas)' })
  @ApiOkResponse({ type: SmallGroupMeetingResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo ou reunião não encontrado' })
  @ApiConflictResponse({ description: 'Data de reunião já utilizada' })
  updateMeeting(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: UpdateSmallGroupMeetingDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMeetingResponseDto> {
    return this.smallGroupsService.updateMeeting(
      id,
      meetingId,
      dto,
      activeCongregationId,
    );
  }

  @Delete(':id/meetings/:meetingId')
  @RequirePermission('small-groups:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir reunião (cascade attendance)' })
  @ApiNoContentResponse({ description: 'Reunião removida' })
  @ApiNotFoundResponse({ description: 'Grupo ou reunião não encontrado' })
  removeMeeting(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.smallGroupsService.removeMeeting(
      id,
      meetingId,
      activeCongregationId,
    );
  }

  @Get(':id/meetings/:meetingId/attendance')
  @ApiOperation({
    summary: 'Folha da chamada da reunião (membros active + merge)',
  })
  @ApiOkResponse({ type: SmallGroupMeetingAttendanceDto })
  @ApiNotFoundResponse({ description: 'Grupo ou reunião não encontrado' })
  getMeetingAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMeetingAttendanceDto> {
    return this.smallGroupsService.getMeetingAttendance(
      id,
      meetingId,
      activeCongregationId,
    );
  }

  @Put(':id/meetings/:meetingId/attendance')
  @RequirePermission('small-groups:write')
  @ApiOperation({
    summary: 'Salvar chamada da reunião (upsert parcial por membro)',
  })
  @ApiOkResponse({ type: SmallGroupMeetingAttendanceDto })
  @ApiNotFoundResponse({ description: 'Grupo ou reunião não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Membro sem vínculo active no grupo',
  })
  upsertMeetingAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: UpsertSmallGroupAttendanceDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupMeetingAttendanceDto> {
    return this.smallGroupsService.upsertMeetingAttendance(
      id,
      meetingId,
      dto,
      activeCongregationId,
    );
  }

  @Get(':id/reports/frequency.csv')
  @ApiOperation({ summary: 'Exportar frequência do grupo em CSV UTF-8' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV com BOM UTF-8',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Período inválido (ordem ou > 24 meses)',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async frequencyCsv(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySmallGroupFrequencyDto,
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const csv = await this.smallGroupsService.exportFrequencyCsv(
      id,
      query,
      activeCongregationId,
    );
    response
      .setHeader(
        'Content-Disposition',
        `attachment; filename="small-group-frequency-${id}-${query.from}-${query.to}.csv"`,
      )
      .send(csv);
  }

  @Get(':id/reports/frequency')
  @ApiOperation({ summary: 'Relatório de frequência do grupo por período' })
  @ApiOkResponse({ type: SmallGroupFrequencyReportDto })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Período inválido (ordem ou > 24 meses)',
  })
  frequencyReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySmallGroupFrequencyDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupFrequencyReportDto> {
    return this.smallGroupsService.getFrequencyReport(
      id,
      query,
      activeCongregationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar pequeno grupo' })
  @ApiOkResponse({ type: SmallGroupResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupResponseDto> {
    return this.smallGroupsService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('small-groups:write')
  @ApiOperation({ summary: 'Atualizar pequeno grupo (parcial)' })
  @ApiOkResponse({ type: SmallGroupResponseDto })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Líder inválido, inativo ou de outra congregação',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSmallGroupDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SmallGroupResponseDto> {
    return this.smallGroupsService.update(id, dto, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('small-groups:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover pequeno grupo (soft delete)' })
  @ApiNoContentResponse({ description: 'Grupo removido' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.smallGroupsService.remove(id, activeCongregationId);
  }
}
