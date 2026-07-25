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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ConstructionUpdatesService } from './construction-updates.service';
import { CreateConstructionUpdateDto } from './dto/create-construction-update.dto';
import {
  ConstructionUpdateResponseDto,
  PaginatedConstructionUpdatesResponseDto,
} from './dto/construction-update-response.dto';
import { QueryConstructionUpdatesDto } from './dto/query-construction-updates.dto';
import { UpdateConstructionUpdateDto } from './dto/update-construction-update.dto';

@ApiTags('construction-updates')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('constructions:read')
@Controller('construction-updates')
export class ConstructionUpdatesController {
  constructor(
    private readonly constructionUpdatesService: ConstructionUpdatesService,
  ) {}

  @Post()
  @RequirePermission('constructions:write')
  @ApiOperation({ summary: 'Registrar andamento de obra' })
  @ApiCreatedResponse({ type: ConstructionUpdateResponseDto })
  @ApiNotFoundResponse({ description: 'Obra não encontrada' })
  @ApiUnprocessableEntityResponse({ description: 'Progresso inválido' })
  create(
    @Body() dto: CreateConstructionUpdateDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionUpdateResponseDto> {
    return this.constructionUpdatesService.create(
      dto,
      activeCongregationId,
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar andamentos (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedConstructionUpdatesResponseDto })
  findAll(
    @Query() query: QueryConstructionUpdatesDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedConstructionUpdatesResponseDto> {
    return this.constructionUpdatesService.findAll(query, activeCongregationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar andamento' })
  @ApiOkResponse({ type: ConstructionUpdateResponseDto })
  @ApiNotFoundResponse({ description: 'Andamento não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionUpdateResponseDto> {
    return this.constructionUpdatesService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('constructions:write')
  @ApiOperation({ summary: 'Atualizar andamento (parcial)' })
  @ApiOkResponse({ type: ConstructionUpdateResponseDto })
  @ApiNotFoundResponse({ description: 'Andamento não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConstructionUpdateDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionUpdateResponseDto> {
    return this.constructionUpdatesService.update(
      id,
      dto,
      activeCongregationId,
    );
  }

  @Delete(':id')
  @RequirePermission('constructions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover andamento (soft delete)' })
  @ApiNoContentResponse({ description: 'Andamento removido' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.constructionUpdatesService.remove(id, activeCongregationId);
  }
}
