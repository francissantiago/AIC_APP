import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CompleteSetupResponseDto } from './dto/complete-setup-response.dto';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { SetupStatusResponseDto } from './dto/setup-status-response.dto';
import { SetupService } from './setup.service';

/**
 * Endpoints públicos (sem JwtAuthGuard): resolvem o impasse de não existir
 * usuário para autenticar na primeira execução. POST é gated por COUNT(users).
 */
@ApiTags('setup')
@ApiErrorResponses()
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @ApiOperation({
    summary: 'Verificar se a instalação ainda exige configuração inicial',
  })
  @ApiOkResponse({ type: SetupStatusResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Limite de requisições excedido' })
  getStatus(): Promise<SetupStatusResponseDto> {
    return this.setupService.getStatus();
  }

  @Post()
  @Throttle({ default: { limit: 3, ttl: seconds(60) } })
  @ApiOperation({
    summary: 'Concluir a configuração inicial (executável uma única vez)',
    description:
      'Cria o usuário administrador (ADMIN, active), atualiza a congregação matriz e vincula a membership padrão. Não emite JWT: o usuário deve autenticar em /auth/login.',
  })
  @ApiCreatedResponse({ type: CompleteSetupResponseDto })
  @ApiConflictResponse({
    description:
      'Configuração já concluída, ou username/email/document já em uso',
  })
  @ApiTooManyRequestsResponse({ description: 'Limite de tentativas excedido' })
  complete(@Body() dto: CompleteSetupDto): Promise<CompleteSetupResponseDto> {
    return this.setupService.complete(dto);
  }
}
