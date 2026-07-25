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
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { CreateMissionFieldDto } from './dto/create-mission-field.dto';
import {
  MissionFieldResponseDto,
  PaginatedMissionFieldsResponseDto,
} from './dto/mission-field-response.dto';
import { QueryMissionFieldsDto } from './dto/query-mission-fields.dto';
import { UpdateMissionFieldDto } from './dto/update-mission-field.dto';
import { MissionFieldsService } from './mission-fields.service';

@ApiTags('mission-fields')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('missions:read')
@Controller('mission-fields')
export class MissionFieldsController {
  constructor(private readonly missionFieldsService: MissionFieldsService) {}

  @Post()
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Criar campo missionário' })
  @ApiCreatedResponse({ type: MissionFieldResponseDto })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Coordenador inválido ou de outra congregação',
  })
  create(
    @Body() dto: CreateMissionFieldDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionFieldResponseDto> {
    return this.missionFieldsService.create(dto, activeCongregationId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar campos missionários (paginado, com filtros)',
  })
  @ApiOkResponse({ type: PaginatedMissionFieldsResponseDto })
  findAll(
    @Query() query: QueryMissionFieldsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedMissionFieldsResponseDto> {
    return this.missionFieldsService.findAll(query, activeCongregationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar campo missionário' })
  @ApiOkResponse({ type: MissionFieldResponseDto })
  @ApiNotFoundResponse({ description: 'Campo missionário não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionFieldResponseDto> {
    return this.missionFieldsService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Atualizar campo missionário (parcial)' })
  @ApiOkResponse({ type: MissionFieldResponseDto })
  @ApiNotFoundResponse({ description: 'Campo missionário não encontrado' })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMissionFieldDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionFieldResponseDto> {
    return this.missionFieldsService.update(id, dto, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('missions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover campo missionário (soft delete)' })
  @ApiNoContentResponse({ description: 'Campo removido' })
  @ApiNotFoundResponse({ description: 'Campo missionário não encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.missionFieldsService.remove(id, activeCongregationId);
  }
}
