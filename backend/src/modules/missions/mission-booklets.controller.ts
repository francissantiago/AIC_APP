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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateMissionBookletDto } from './dto/create-mission-booklet.dto';
import { MissionBookletInstallmentResponseDto } from './dto/mission-booklet-installment-response.dto';
import {
  MissionBookletResponseDto,
  PaginatedMissionBookletsResponseDto,
} from './dto/mission-booklet-response.dto';
import { PayMissionBookletInstallmentDto } from './dto/pay-mission-booklet-installment.dto';
import { QueryMissionBookletsDto } from './dto/query-mission-booklets.dto';
import { UpdateMissionBookletDto } from './dto/update-mission-booklet.dto';
import { MissionBookletsService } from './mission-booklets.service';

@ApiTags('mission-booklets')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('missions:read')
@Controller('mission-booklets')
export class MissionBookletsController {
  constructor(
    private readonly missionBookletsService: MissionBookletsService,
  ) {}

  @Post()
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Emitir carnê missionário' })
  @ApiCreatedResponse({ type: MissionBookletResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Destino ou membro inválido' })
  create(
    @Body() dto: CreateMissionBookletDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionBookletResponseDto> {
    return this.missionBookletsService.create(dto, user, activeCongregationId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar carnês missionários (paginado)' })
  @ApiOkResponse({ type: PaginatedMissionBookletsResponseDto })
  findAll(
    @Query() query: QueryMissionBookletsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedMissionBookletsResponseDto> {
    return this.missionBookletsService.findAll(query, activeCongregationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar carnê missionário' })
  @ApiOkResponse({ type: MissionBookletResponseDto })
  @ApiNotFoundResponse({ description: 'Carnê não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionBookletResponseDto> {
    return this.missionBookletsService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Atualizar carnê missionário (parcial)' })
  @ApiOkResponse({ type: MissionBookletResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMissionBookletDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionBookletResponseDto> {
    return this.missionBookletsService.update(id, dto, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('missions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover carnê missionário (soft delete)' })
  @ApiNoContentResponse({ description: 'Carnê removido' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.missionBookletsService.remove(id, activeCongregationId);
  }

  @Get(':id/installments')
  @ApiOperation({ summary: 'Listar parcelas do carnê' })
  @ApiOkResponse({ type: MissionBookletInstallmentResponseDto, isArray: true })
  findInstallments(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionBookletInstallmentResponseDto[]> {
    return this.missionBookletsService.findInstallments(
      id,
      activeCongregationId,
    );
  }

  @Post(':bookletId/installments/:installmentId/pay')
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Registrar pagamento de parcela' })
  @ApiOkResponse({ type: MissionBookletInstallmentResponseDto })
  @ApiConflictResponse({ description: 'Parcela já quitada' })
  payInstallment(
    @Param('bookletId', ParseUUIDPipe) bookletId: string,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @Body() dto: PayMissionBookletInstallmentDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionBookletInstallmentResponseDto> {
    return this.missionBookletsService.payInstallment(
      bookletId,
      installmentId,
      dto,
      user,
      activeCongregationId,
    );
  }

  @Post(':bookletId/installments/:installmentId/cancel')
  @RequirePermission('missions:write')
  @ApiOperation({ summary: 'Cancelar parcela pendente' })
  @ApiOkResponse({ type: MissionBookletInstallmentResponseDto })
  cancelInstallment(
    @Param('bookletId', ParseUUIDPipe) bookletId: string,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MissionBookletInstallmentResponseDto> {
    return this.missionBookletsService.cancelInstallment(
      bookletId,
      installmentId,
      activeCongregationId,
    );
  }
}
