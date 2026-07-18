import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { SecretariatDashboardResponseDto } from './dto/secretariat.dto';
import { SecretariatService } from './secretariat.service';

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('secretariat:read')
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
