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
import { CongregationsService } from './congregations.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import {
  CongregationResponseDto,
  PaginatedCongregationsResponseDto,
} from './dto/congregation-response.dto';
import { QueryCongregationsDto } from './dto/query-congregations.dto';
import { UpdateCongregationDto } from './dto/update-congregation.dto';

@ApiTags('congregations')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('congregations:read')
@Controller('congregations')
export class CongregationBranchesController {
  constructor(private readonly congregationsService: CongregationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar congregações (HQ + filiais ativas), paginado e com filtros',
  })
  @ApiOkResponse({ type: PaginatedCongregationsResponseDto })
  findAll(
    @Query() query: QueryCongregationsDto,
  ): Promise<PaginatedCongregationsResponseDto> {
    return this.congregationsService.findAll(query);
  }

  @Post()
  @RequirePermission('congregations:manage_branches')
  @ApiOperation({ summary: 'Criar filial (sempre type=branch)' })
  @ApiCreatedResponse({ type: CongregationResponseDto })
  @ApiUnprocessableEntityResponse({
    description:
      'parentId inexistente ou não é uma congregação-sede (headquarters)',
  })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  createBranch(@Body() dto: CreateBranchDto): Promise<CongregationResponseDto> {
    return this.congregationsService.createBranch(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma congregação (HQ ou filial) por id' })
  @ApiOkResponse({ type: CongregationResponseDto })
  @ApiNotFoundResponse({ description: 'Congregação não encontrada' })
  getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CongregationResponseDto> {
    return this.congregationsService.getById(id);
  }

  @Patch(':id')
  @RequirePermission('congregations:write')
  @ApiOperation({
    summary: 'Atualizar campos de dados de uma congregação (HQ ou filial)',
  })
  @ApiOkResponse({ type: CongregationResponseDto })
  @ApiNotFoundResponse({ description: 'Congregação não encontrada' })
  @ApiUnprocessableEntityResponse({
    description: 'Tentativa de reclassificar type (sede/filial)',
  })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCongregationDto,
  ): Promise<CongregationResponseDto> {
    return this.congregationsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('congregations:manage_branches')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover (soft delete) uma congregação' })
  @ApiNoContentResponse({ description: 'Congregação removida' })
  @ApiNotFoundResponse({ description: 'Congregação não encontrada' })
  @ApiConflictResponse({
    description: 'Não é possível remover: a HQ possui filiais ativas',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.congregationsService.removeNode(id);
  }
}
