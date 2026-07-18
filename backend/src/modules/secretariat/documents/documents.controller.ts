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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CreateSecretariatDocumentDto,
  PaginatedSecretariatDocumentsResponseDto,
  QuerySecretariatDocumentsDto,
  SecretariatDocumentResponseDto,
  UpdateSecretariatDocumentDto,
} from '../dto/secretariat.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('secretariat:read')
@Controller('secretariat/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atas e documentos de secretaria' })
  @ApiOkResponse({ type: PaginatedSecretariatDocumentsResponseDto })
  findDocuments(
    @Query() query: QuerySecretariatDocumentsDto,
  ): Promise<PaginatedSecretariatDocumentsResponseDto> {
    return this.documentsService.findDocuments(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar documento de secretaria' })
  @ApiOkResponse({ type: SecretariatDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  findDocument(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.findDocument(id);
  }

  @Post()
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Registrar ata ou documento de secretaria' })
  @ApiCreatedResponse({ type: SecretariatDocumentResponseDto })
  createDocument(
    @Body() dto: CreateSecretariatDocumentDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.createDocument(dto, user);
  }

  @Patch(':id')
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Atualizar documento de secretaria' })
  @ApiOkResponse({ type: SecretariatDocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSecretariatDocumentDto,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.updateDocument(id, dto);
  }

  @Delete(':id')
  @RequirePermission('secretariat:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover documento de secretaria por soft delete' })
  @ApiNoContentResponse({ description: 'Documento removido' })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  removeDocument(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documentsService.removeDocument(id);
  }
}
