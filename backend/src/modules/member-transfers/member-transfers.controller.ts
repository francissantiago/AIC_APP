import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateMemberTransferDto } from './dto/create-member-transfer.dto';
import { MemberTransferResponseDto } from './dto/member-transfer-response.dto';
import { MemberTransfersService } from './member-transfers.service';

@ApiTags('member-transfers')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('members:read')
@Controller('members/:memberId/transfers')
export class MemberTransfersController {
  constructor(
    private readonly memberTransfersService: MemberTransfersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar transferências do membro' })
  @ApiOkResponse({ type: MemberTransferResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  list(
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<MemberTransferResponseDto[]> {
    return this.memberTransfersService.listByMember(memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar transferência do membro' })
  @ApiOkResponse({ type: MemberTransferResponseDto })
  @ApiNotFoundResponse({
    description: 'Membro ou transferência não encontrada',
  })
  findOne(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MemberTransferResponseDto> {
    return this.memberTransfersService.findOne(memberId, id);
  }

  @Post()
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Criar transferência de membro com carta' })
  @ApiCreatedResponse({ type: MemberTransferResponseDto })
  @ApiConflictResponse({
    description: 'Já existe transferência pendente',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Membro não elegível para transferência',
  })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  create(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateMemberTransferDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<MemberTransferResponseDto> {
    return this.memberTransfersService.create(memberId, dto, user);
  }

  @Post(':id/complete')
  @RequirePermission('members:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Concluir transferência pendente' })
  @ApiOkResponse({ type: MemberTransferResponseDto })
  @ApiConflictResponse({
    description: 'Status da transferência não permite conclusão',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Membro não elegível para transferência',
  })
  @ApiNotFoundResponse({
    description: 'Membro ou transferência não encontrada',
  })
  complete(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MemberTransferResponseDto> {
    return this.memberTransfersService.complete(memberId, id);
  }

  @Post(':id/cancel')
  @RequirePermission('members:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar transferência pendente' })
  @ApiOkResponse({ type: MemberTransferResponseDto })
  @ApiConflictResponse({
    description: 'Status da transferência não permite cancelamento',
  })
  @ApiNotFoundResponse({
    description: 'Membro ou transferência não encontrada',
  })
  cancel(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MemberTransferResponseDto> {
    return this.memberTransfersService.cancel(memberId, id);
  }
}
