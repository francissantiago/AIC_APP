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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AssetsService } from './assets.service';
import {
  AssetReportResponseDto,
  AssetResponseDto,
  CreateAssetDto,
  PaginatedAssetsResponseDto,
  QueryAssetsDto,
  UpdateAssetDto,
} from './dto/assets.dto';

@ApiTags('assets')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('assets:read')
@Controller('finance')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('reports/assets')
  @ApiOperation({ summary: 'Gerar relatório de inventário patrimonial' })
  @ApiOkResponse({ type: AssetReportResponseDto })
  assetReport(
    @Query() query: QueryAssetsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<AssetReportResponseDto> {
    return this.assetsService.getAssetReport(query, activeCongregationId);
  }

  @Get('assets')
  @ApiOperation({ summary: 'Listar bens patrimoniais' })
  @ApiOkResponse({ type: PaginatedAssetsResponseDto })
  findAssets(
    @Query() query: QueryAssetsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedAssetsResponseDto> {
    return this.assetsService.findAssets(query, activeCongregationId);
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Detalhar bem patrimonial' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'Bem não encontrado' })
  findAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<AssetResponseDto> {
    return this.assetsService.findAsset(id, activeCongregationId);
  }

  @Post('assets')
  @RequirePermission('assets:write')
  @ApiOperation({ summary: 'Cadastrar bem patrimonial' })
  @ApiCreatedResponse({ type: AssetResponseDto })
  @ApiConflictResponse({
    description: 'Identificação patrimonial já está em uso',
  })
  createAsset(
    @Body() dto: CreateAssetDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<AssetResponseDto> {
    return this.assetsService.createAsset(dto, user, activeCongregationId);
  }

  @Patch('assets/:id')
  @RequirePermission('assets:write')
  @ApiOperation({ summary: 'Atualizar bem patrimonial' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'Bem não encontrado' })
  @ApiConflictResponse({
    description: 'Identificação patrimonial já está em uso',
  })
  updateAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<AssetResponseDto> {
    return this.assetsService.updateAsset(id, dto, activeCongregationId);
  }

  @Delete('assets/:id')
  @RequirePermission('assets:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover bem patrimonial por soft delete' })
  @ApiNoContentResponse({ description: 'Bem removido' })
  @ApiNotFoundResponse({ description: 'Bem não encontrado' })
  removeAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.assetsService.removeAsset(id, activeCongregationId);
  }
}
