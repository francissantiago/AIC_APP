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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { CreateMissionAssignmentDto } from './dto/create-mission-assignment.dto';
import {
  MissionAssignmentResponseDto,
  PaginatedMissionAssignmentsResponseDto,
} from './dto/mission-assignment-response.dto';
import { QueryMissionAssignmentsDto } from './dto/query-mission-assignments.dto';
import { UpdateMissionAssignmentDto } from './dto/update-mission-assignment.dto';
import { MissionAssignmentsService } from './mission-assignments.service';

@ApiTags('mission-assignments')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('missions:read')
@Controller('mission-assignments')
export class MissionAssignmentsController {
  constructor(
    private readonly missionAssignmentsService: MissionAssignmentsService,
  ) {}

  @Post()
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Registrar envio missionário' })
  @ApiCreatedResponse({ type: MissionAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Membro ou campo não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Membro de outra congregação ou datas inválidas',
  })
  create(
    @Body() dto: CreateMissionAssignmentDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionAssignmentResponseDto> {
    return this.missionAssignmentsService.create(dto, activeCongregationId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar envios missionários (paginado, com filtros)',
  })
  @ApiOkResponse({ type: PaginatedMissionAssignmentsResponseDto })
  findAll(
    @Query() query: QueryMissionAssignmentsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedMissionAssignmentsResponseDto> {
    return this.missionAssignmentsService.findAll(query, activeCongregationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar envio missionário' })
  @ApiOkResponse({ type: MissionAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Envio não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionAssignmentResponseDto> {
    return this.missionAssignmentsService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Atualizar envio missionário (parcial)' })
  @ApiOkResponse({ type: MissionAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Envio não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Datas ou vínculos inválidos',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMissionAssignmentDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionAssignmentResponseDto> {
    return this.missionAssignmentsService.update(id, dto, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('missions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover envio missionário (soft delete)' })
  @ApiNoContentResponse({ description: 'Envio removido' })
  @ApiNotFoundResponse({ description: 'Envio não encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.missionAssignmentsService.remove(id, activeCongregationId);
  }
}
