import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponses } from '../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ActiveCongregation } from '../../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CreateSecretariatDocumentDto,
  PaginatedSecretariatDocumentsResponseDto,
  QuerySecretariatDocumentsDto,
  SecretariatDocumentResponseDto,
  UpdateSecretariatDocumentDto,
} from '../dto/secretariat.dto';
import { UploadedFile as SecretariatUploadedFile } from '../storage/uploaded-file.interface';
import { DocumentsService } from './documents.service';

const DEFAULT_UPLOAD_MAX_BYTES = 10_485_760;

function resolveUploadMaxBytes(): number {
  const parsed = Number(process.env.UPLOAD_MAX_BYTES);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_UPLOAD_MAX_BYTES;
}

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('secretariat:read')
@Controller('secretariat/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atas e documentos de secretaria' })
  @ApiOkResponse({ type: PaginatedSecretariatDocumentsResponseDto })
  findDocuments(
    @Query() query: QuerySecretariatDocumentsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSecretariatDocumentsResponseDto> {
    return this.documentsService.findDocuments(query, activeCongregationId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Baixar arquivo anexado ao documento' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Stream binário do arquivo anexado',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({
    description: 'Documento ou arquivo não encontrado',
  })
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const file = await this.documentsService.downloadFile(
      id,
      activeCongregationId,
    );
    const safeName = file.originalFilename.replace(/"/g, '');
    response
      .setHeader('Content-Type', file.mimeType)
      .setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
      .setHeader('Content-Length', String(file.sizeBytes));
    file.stream.pipe(response);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar documento de secretaria' })
  @ApiOkResponse({ type: SecretariatDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  findDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.findDocument(id, activeCongregationId);
  }

  @Post()
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Registrar ata ou documento de secretaria' })
  @ApiCreatedResponse({ type: SecretariatDocumentResponseDto })
  createDocument(
    @Body() dto: CreateSecretariatDocumentDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.createDocument(
      dto,
      user,
      activeCongregationId,
    );
  }

  @Post(':id/upload')
  @RequirePermission('secretariat:write')
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
          description:
            'Arquivo anexado (PDF, DOCX, PNG ou JPEG). Campo multipart: file.',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Enviar ou substituir arquivo anexado ao documento',
  })
  @ApiOkResponse({ type: SecretariatDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  @ApiBadRequestResponse({
    description: 'Arquivo ausente, tipo inválido ou tamanho excedido',
  })
  uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: SecretariatUploadedFile | undefined,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.uploadFile(id, file, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Atualizar documento de secretaria' })
  @ApiOkResponse({ type: SecretariatDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSecretariatDocumentDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.updateDocument(id, dto, activeCongregationId);
  }

  @Delete(':id/file')
  @RequirePermission('secretariat:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover arquivo anexado ao documento' })
  @ApiNoContentResponse({ description: 'Anexo removido' })
  @ApiNotFoundResponse({
    description: 'Documento ou arquivo não encontrado',
  })
  removeFile(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.documentsService.removeFile(id, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('secretariat:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover documento de secretaria por soft delete' })
  @ApiNoContentResponse({ description: 'Documento removido' })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.documentsService.removeDocument(id, activeCongregationId);
  }
}
