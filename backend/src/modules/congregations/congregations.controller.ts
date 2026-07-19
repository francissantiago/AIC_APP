import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from './decorators/active-congregation.decorator';
import { CongregationResponseDto } from './dto/congregation-response.dto';
import { UpdateCongregationDto } from './dto/update-congregation.dto';
import { CongregationsService } from './congregations.service';
import { CongregationContextGuard } from './guards/congregation-context.guard';

@ApiTags('congregation')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('congregations:read')
@Controller('congregation')
export class CongregationsController {
  constructor(private readonly congregationsService: CongregationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obter a congregação-base desta instalação' })
  @ApiOkResponse({ type: CongregationResponseDto })
  getBase(
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<CongregationResponseDto> {
    return this.congregationsService.getBase(activeCongregationId);
  }

  @Patch()
  @RequirePermission('congregations:write')
  @ApiOperation({ summary: 'Atualizar a congregação-base (parcial)' })
  @ApiOkResponse({ type: CongregationResponseDto })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  updateBase(
    @Body() dto: UpdateCongregationDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<CongregationResponseDto> {
    return this.congregationsService.updateBase(dto, activeCongregationId);
  }
}
