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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar catálogo fechado de permissões (recurso:ação)',
  })
  @ApiOkResponse({ type: PermissionResponseDto, isArray: true })
  findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }
}
