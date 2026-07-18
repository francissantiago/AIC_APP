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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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

const READ_ROLES = ['ADMIN', 'TREASURER', 'PASTOR'];
const WRITE_ROLES = ['ADMIN', 'TREASURER'];

@ApiTags('assets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('finance')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('reports/assets')
  @ApiOperation({ summary: 'Gerar relatório de inventário patrimonial' })
  @ApiOkResponse({ type: AssetReportResponseDto })
  assetReport(@Query() query: QueryAssetsDto): Promise<AssetReportResponseDto> {
    return this.assetsService.getAssetReport(query);
  }

  @Get('assets')
  @ApiOperation({ summary: 'Listar bens patrimoniais' })
  @ApiOkResponse({ type: PaginatedAssetsResponseDto })
  findAssets(
    @Query() query: QueryAssetsDto,
  ): Promise<PaginatedAssetsResponseDto> {
    return this.assetsService.findAssets(query);
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Detalhar bem patrimonial' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'Bem não encontrado' })
  findAsset(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.assetsService.findAsset(id);
  }

  @Post('assets')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cadastrar bem patrimonial' })
  @ApiCreatedResponse({ type: AssetResponseDto })
  @ApiConflictResponse({
    description: 'Identificação patrimonial já está em uso',
  })
  createAsset(
    @Body() dto: CreateAssetDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.createAsset(dto, user);
  }

  @Patch('assets/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Atualizar bem patrimonial' })
  @ApiOkResponse({ type: AssetResponseDto })
  @ApiNotFoundResponse({ description: 'Bem não encontrado' })
  @ApiConflictResponse({
    description: 'Identificação patrimonial já está em uso',
  })
  updateAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.updateAsset(id, dto);
  }

  @Delete('assets/:id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover bem patrimonial por soft delete' })
  @ApiNoContentResponse({ description: 'Bem removido' })
  @ApiNotFoundResponse({ description: 'Bem não encontrado' })
  removeAsset(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.assetsService.removeAsset(id);
  }
}
