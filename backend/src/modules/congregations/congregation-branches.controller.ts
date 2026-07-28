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
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CongregationsService } from './congregations.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import {
  CongregationResponseDto,
  PaginatedCongregationsResponseDto,
} from './dto/congregation-response.dto';
import { QueryCongregationsDto } from './dto/query-congregations.dto';
import { UpdateCongregationDto } from './dto/update-congregation.dto';
import { UserCongregationsService } from './user-congregations.service';

@ApiTags('congregations')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('congregations:read')
@Controller('congregations')
export class CongregationBranchesController {
  constructor(
    private readonly congregationsService: CongregationsService,
    private readonly userCongregationsService: UserCongregationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar congregações (HQ + filiais ativas), paginado e com filtros',
  })
  @ApiOkResponse({ type: PaginatedCongregationsResponseDto })
  async findAll(
    @Query() query: QueryCongregationsDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<PaginatedCongregationsResponseDto> {
    if (this.isAdmin(user)) {
      return this.congregationsService.findAll(query);
    }
    const memberships = await this.userCongregationsService.listForUser(
      user.id,
    );
    const allowedIds = memberships.map(
      (membership) => membership.congregationId,
    );
    return this.congregationsService.findAll(query, allowedIds);
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
  async createBranch(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<CongregationResponseDto> {
    const parentId =
      dto.parentId ?? (await this.congregationsService.getOrCreateBase()).id;
    await this.assertCanAccessCongregation(user, parentId);
    return this.congregationsService.createBranch(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma congregação (HQ ou filial) por id' })
  @ApiOkResponse({ type: CongregationResponseDto })
  @ApiNotFoundResponse({ description: 'Congregação não encontrada' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserResponseDto,
  ): Promise<CongregationResponseDto> {
    await this.assertCanAccessCongregation(user, id);
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCongregationDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<CongregationResponseDto> {
    await this.assertCanAccessCongregation(user, id);
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
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserResponseDto,
  ): Promise<void> {
    await this.assertCanAccessCongregation(user, id);
    return this.congregationsService.removeNode(id);
  }

  private isAdmin(user: UserResponseDto): boolean {
    return (user.roles ?? []).some((role) => role.code === 'ADMIN');
  }

  private async assertCanAccessCongregation(
    user: UserResponseDto,
    congregationId: string,
  ): Promise<void> {
    if (this.isAdmin(user)) {
      return;
    }
    const isMember = await this.userCongregationsService.isMember(
      user.id,
      congregationId,
    );
    if (!isMember) {
      throw new ApiException(HttpStatus.FORBIDDEN, {
        code: ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED,
        message: ApiErrorMessage[ApiErrorCode.CONGREGATIONS_CONTEXT_DENIED],
      });
    }
  }
}
