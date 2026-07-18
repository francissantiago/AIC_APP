import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SecretariatDashboardResponseDto } from './dto/secretariat.dto';
import { SecretariatService } from './secretariat.service';

const READ_ROLES = ['ADMIN', 'PASTOR', 'SECRETARY'];

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('secretariat')
export class SecretariatController {
  constructor(private readonly secretariatService: SecretariatService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Obter indicadores e séries do módulo de secretaria',
  })
  @ApiOkResponse({ type: SecretariatDashboardResponseDto })
  dashboard(): Promise<SecretariatDashboardResponseDto> {
    return this.secretariatService.getDashboard();
  }
}
