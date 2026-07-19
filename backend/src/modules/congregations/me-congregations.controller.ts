import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserCongregationResponseDto } from './dto/user-congregation-response.dto';
import { UserCongregationsService } from './user-congregations.service';

@ApiTags('me')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@UseGuards(JwtAuthGuard)
@Controller('me/congregations')
export class MeCongregationsController {
  constructor(
    private readonly userCongregationsService: UserCongregationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar congregações acessíveis pelo usuário autenticado',
  })
  @ApiOkResponse({ type: UserCongregationResponseDto, isArray: true })
  findMine(
    @CurrentUser() user: UserResponseDto,
  ): Promise<UserCongregationResponseDto[]> {
    return this.userCongregationsService.listForUser(user.id);
  }
}
