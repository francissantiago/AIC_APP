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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CreateSecretariatDocumentDto,
  PaginatedSecretariatDocumentsResponseDto,
  QuerySecretariatDocumentsDto,
  SecretariatDocumentResponseDto,
  UpdateSecretariatDocumentDto,
} from '../dto/secretariat.dto';
import { DocumentsService } from './documents.service';

const READ_ROLES = ['ADMIN', 'PASTOR', 'SECRETARY'];
const WRITE_ROLES = ['ADMIN', 'SECRETARY'];

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ_ROLES)
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
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Registrar ata ou documento de secretaria' })
  @ApiCreatedResponse({ type: SecretariatDocumentResponseDto })
  createDocument(
    @Body() dto: CreateSecretariatDocumentDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<SecretariatDocumentResponseDto> {
    return this.documentsService.createDocument(dto, user);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
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
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover documento de secretaria por soft delete' })
  @ApiNoContentResponse({ description: 'Documento removido' })
  @ApiNotFoundResponse({ description: 'Documento não encontrado' })
  removeDocument(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documentsService.removeDocument(id);
  }
}
