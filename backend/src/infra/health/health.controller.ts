import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check da API',
    description:
      'Retorna status operacional, timestamp e versão da API em execução.',
  })
  @ApiOkResponse({ type: HealthResponseDto, description: 'API operacional' })
  getHealth(): HealthResponseDto {
    return this.healthService.getStatus();
  }
}
