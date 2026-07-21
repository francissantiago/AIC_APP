import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UploadedFile as MembershipUploadedFile } from '../secretariat/storage/uploaded-file.interface';
import { MembershipCardBatchQueryDto } from './dto/membership-card-batch-query.dto';
import { MembershipCardResponseDto } from './dto/membership-card-response.dto';
import { MembershipCardSettingsResponseDto } from './dto/membership-card-settings-response.dto';
import { UpdateMembershipCardSettingsDto } from './dto/update-membership-card-settings.dto';
import { MembershipCardsService } from './membership-cards.service';

const DEFAULT_UPLOAD_MAX_BYTES = 10_485_760;

function resolveUploadMaxBytes(): number {
  const parsed = Number(process.env.UPLOAD_MAX_BYTES);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_UPLOAD_MAX_BYTES;
}

@ApiTags('membership-cards')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('membership-cards:read')
@Controller('membership-cards')
export class MembershipCardsController {
  constructor(
    private readonly membershipCardsService: MembershipCardsService,
  ) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Obter configurações da carteirinha da congregação ativa',
  })
  @ApiOkResponse({ type: MembershipCardSettingsResponseDto })
  getSettings(
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    return this.membershipCardsService.getSettings(activeCongregationId);
  }

  @Patch('settings')
  @RequirePermission('membership-cards:write')
  @ApiOperation({ summary: 'Atualizar configurações da carteirinha' })
  @ApiOkResponse({ type: MembershipCardSettingsResponseDto })
  updateSettings(
    @Body() dto: UpdateMembershipCardSettingsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    return this.membershipCardsService.updateSettings(
      dto,
      activeCongregationId,
    );
  }

  @Post('settings/logo')
  @RequirePermission('membership-cards:write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: resolveUploadMaxBytes() },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Logo institucional (PNG ou JPEG)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Enviar logo institucional' })
  @ApiOkResponse({ type: MembershipCardSettingsResponseDto })
  @ApiBadRequestResponse({
    description: 'Arquivo ausente, tipo inválido ou tamanho excedido',
  })
  uploadLogo(
    @UploadedFile() file: MembershipUploadedFile | undefined,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    return this.membershipCardsService.uploadLogo(file, activeCongregationId);
  }

  @Post('settings/signature')
  @RequirePermission('membership-cards:write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: resolveUploadMaxBytes() },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Assinatura institucional (PNG ou JPEG)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Enviar assinatura institucional' })
  @ApiOkResponse({ type: MembershipCardSettingsResponseDto })
  @ApiBadRequestResponse({
    description: 'Arquivo ausente, tipo inválido ou tamanho excedido',
  })
  uploadSignature(
    @UploadedFile() file: MembershipUploadedFile | undefined,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MembershipCardSettingsResponseDto> {
    return this.membershipCardsService.uploadSignature(
      file,
      activeCongregationId,
    );
  }

  @Get('settings/logo')
  @ApiOperation({ summary: 'Obter logo institucional' })
  @ApiProduces('image/png', 'image/jpeg')
  @ApiOkResponse({
    description: 'Stream da logo',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Logo não encontrada' })
  async getLogo(
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const file =
      await this.membershipCardsService.getLogoStream(activeCongregationId);
    response.setHeader('Content-Type', file.mimeType);
    file.stream.pipe(response);
  }

  @Get('settings/signature')
  @ApiOperation({ summary: 'Obter assinatura institucional' })
  @ApiProduces('image/png', 'image/jpeg')
  @ApiOkResponse({
    description: 'Stream da assinatura',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Assinatura não encontrada' })
  async getSignature(
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const file =
      await this.membershipCardsService.getSignatureStream(
        activeCongregationId,
      );
    response.setHeader('Content-Type', file.mimeType);
    file.stream.pipe(response);
  }

  @Get()
  @ApiOperation({
    summary: 'Obter carteirinhas em lote (máx. 50 membros)',
  })
  @ApiOkResponse({ type: MembershipCardResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description: 'memberIds inválido ou acima do limite',
  })
  @ApiNotFoundResponse({ description: 'Um ou mais membros não encontrados' })
  getCardsBatch(
    @Query() query: MembershipCardBatchQueryDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MembershipCardResponseDto[]> {
    return this.membershipCardsService.getCardsBatch(
      query.memberIds,
      activeCongregationId,
    );
  }

  @Get(':memberId')
  @ApiOperation({ summary: 'Obter payload da carteirinha de um membro' })
  @ApiOkResponse({ type: MembershipCardResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  getCard(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MembershipCardResponseDto> {
    return this.membershipCardsService.getCard(memberId, activeCongregationId);
  }
}
