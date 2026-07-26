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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { QuerySocialProjectSessionsDto } from './dto/query-social-project-sessions.dto';
import { SocialProjectAttendanceResponseDto } from './dto/social-project-attendance-response.dto';
import {
  PaginatedSocialProjectSessionsResponseDto,
  SocialProjectSessionResponseDto,
} from './dto/social-project-session-response.dto';
import { CreateSocialProjectSessionDto } from './dto/create-social-project-session.dto';
import { UpdateSocialProjectSessionDto } from './dto/update-social-project-session.dto';
import { UpsertSocialProjectAttendanceDto } from './dto/upsert-social-project-attendance.dto';
import { SocialProjectSessionsService } from './social-project-sessions.service';

@ApiTags('social-projects')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('social-projects:read')
@Controller('social-projects')
export class SocialProjectSessionsController {
  constructor(
    private readonly socialProjectSessionsService: SocialProjectSessionsService,
  ) {}

  @Get('sessions')
  @ApiOperation({
    summary: 'Listar sessões globalmente (paginado, com filtros)',
  })
  @ApiOkResponse({ type: PaginatedSocialProjectSessionsResponseDto })
  findAllGlobal(
    @Query() query: QuerySocialProjectSessionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectSessionsResponseDto> {
    return this.socialProjectSessionsService.findAllGlobal(
      query,
      activeCongregationId,
    );
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Listar sessões de um projeto social' })
  @ApiOkResponse({ type: PaginatedSocialProjectSessionsResponseDto })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado' })
  findByProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySocialProjectSessionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectSessionsResponseDto> {
    return this.socialProjectSessionsService.findByProject(
      id,
      query,
      activeCongregationId,
    );
  }

  @Post(':id/sessions')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Criar sessão/atividade do projeto' })
  @ApiCreatedResponse({ type: SocialProjectSessionResponseDto })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado' })
  @ApiUnprocessableEntityResponse({ description: 'Data já registrada' })
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSocialProjectSessionDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectSessionResponseDto> {
    return this.socialProjectSessionsService.create(
      id,
      dto,
      user.id,
      activeCongregationId,
    );
  }

  @Patch(':id/sessions/:sessionId')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Atualizar sessão do projeto' })
  @ApiOkResponse({ type: SocialProjectSessionResponseDto })
  @ApiNotFoundResponse({ description: 'Sessão não encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateSocialProjectSessionDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectSessionResponseDto> {
    return this.socialProjectSessionsService.update(
      id,
      sessionId,
      dto,
      activeCongregationId,
    );
  }

  @Delete(':id/sessions/:sessionId')
  @RequirePermission('social-projects:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover sessão (soft delete)' })
  @ApiNoContentResponse({ description: 'Sessão removida' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.socialProjectSessionsService.remove(
      id,
      sessionId,
      activeCongregationId,
    );
  }

  @Get(':id/sessions/:sessionId/attendance')
  @ApiOperation({ summary: 'Folha de chamada da sessão' })
  @ApiOkResponse({ type: SocialProjectAttendanceResponseDto })
  @ApiNotFoundResponse({ description: 'Sessão não encontrada' })
  getAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectAttendanceResponseDto> {
    return this.socialProjectSessionsService.getAttendance(
      id,
      sessionId,
      activeCongregationId,
    );
  }

  @Put(':id/sessions/:sessionId/attendance')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Salvar chamada em lote' })
  @ApiOkResponse({ type: SocialProjectAttendanceResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'Membro não é participante do projeto',
  })
  upsertAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpsertSocialProjectAttendanceDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectAttendanceResponseDto> {
    return this.socialProjectSessionsService.upsertAttendance(
      id,
      sessionId,
      dto,
      activeCongregationId,
    );
  }
}
