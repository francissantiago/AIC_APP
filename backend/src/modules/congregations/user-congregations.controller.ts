import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SetUserCongregationsDto } from './dto/set-user-congregations.dto';
import { UserCongregationResponseDto } from './dto/user-congregation-response.dto';
import { UserCongregationsService } from './user-congregations.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('congregations:manage_members')
@Controller('users/:userId/congregations')
export class UserCongregationsController {
  constructor(
    private readonly userCongregationsService: UserCongregationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar memberships de congregação de um usuário' })
  @ApiOkResponse({ type: UserCongregationResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  findForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserCongregationResponseDto[]> {
    return this.userCongregationsService.listForUser(userId);
  }

  @Put()
  @ApiOperation({
    summary: 'Substituir o conjunto completo de memberships do usuário',
  })
  @ApiOkResponse({ type: UserCongregationResponseDto, isArray: true })
  @ApiNotFoundResponse({
    description: 'Usuário ou congregação não encontrados',
  })
  @ApiUnprocessableEntityResponse({
    description: 'defaultCongregationId ausente em congregationIds',
  })
  setForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetUserCongregationsDto,
  ): Promise<UserCongregationResponseDto[]> {
    return this.userCongregationsService.setForUser(userId, dto);
  }
}
