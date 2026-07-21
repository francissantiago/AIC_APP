import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewResponseDto } from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@UseGuards(JwtAuthGuard, CongregationContextGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Obter visão geral da dashboard inicial',
    description:
      'Retorna KPIs, alertas, gráficos e listas auxiliares filtrados por permissões do usuário e congregação ativa',
  })
  @ApiOkResponse({ type: DashboardOverviewResponseDto })
  async getOverview(
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId: string,
  ): Promise<DashboardOverviewResponseDto> {
    return this.dashboardService.getOverview(
      user.id,
      activeCongregationId,
      user.permissions,
    );
  }
}
