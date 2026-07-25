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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UploadedFile as StorageUploadedFile } from '../secretariat/storage/uploaded-file.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ConstructionExpensesService } from './construction-expenses.service';
import { ConstructionPhotosService } from './construction-photos.service';
import { ConstructionProjectsService } from './construction-projects.service';
import { CreateConstructionExpenseDto } from './dto/create-construction-expense.dto';
import { CreateConstructionPhotoDto } from './dto/create-construction-photo.dto';
import { CreateConstructionProjectDto } from './dto/create-construction-project.dto';
import {
  ConstructionExpenseResponseDto,
  PaginatedConstructionExpensesResponseDto,
} from './dto/construction-expense-response.dto';
import {
  ConstructionPhotoResponseDto,
  PaginatedConstructionPhotosResponseDto,
} from './dto/construction-photo-response.dto';
import {
  ConstructionProjectResponseDto,
  PaginatedConstructionProjectsResponseDto,
} from './dto/construction-project-response.dto';
import { QueryConstructionExpensesDto } from './dto/query-construction-expenses.dto';
import { QueryConstructionProjectsDto } from './dto/query-construction-projects.dto';
import { UpdateConstructionProjectDto } from './dto/update-construction-project.dto';

const DEFAULT_UPLOAD_MAX_BYTES = 10_485_760;

function resolveUploadMaxBytes(): number {
  const parsed = Number(process.env.UPLOAD_MAX_BYTES);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_UPLOAD_MAX_BYTES;
}

@ApiTags('construction-projects')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('constructions:read')
@Controller('construction-projects')
export class ConstructionProjectsController {
  constructor(
    private readonly constructionProjectsService: ConstructionProjectsService,
    private readonly constructionExpensesService: ConstructionExpensesService,
    private readonly constructionPhotosService: ConstructionPhotosService,
  ) {}

  @Post()
  @RequirePermission('constructions:write')
  @ApiOperation({ summary: 'Criar projeto de obra' })
  @ApiCreatedResponse({ type: ConstructionProjectResponseDto })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Ministério ou supervisor inválido',
  })
  create(
    @Body() dto: CreateConstructionProjectDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionProjectResponseDto> {
    return this.constructionProjectsService.create(
      dto,
      user.id,
      activeCongregationId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar obras (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedConstructionProjectsResponseDto })
  findAll(
    @Query() query: QueryConstructionProjectsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedConstructionProjectsResponseDto> {
    return this.constructionProjectsService.findAll(
      query,
      activeCongregationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar obra' })
  @ApiOkResponse({ type: ConstructionProjectResponseDto })
  @ApiNotFoundResponse({ description: 'Obra não encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionProjectResponseDto> {
    return this.constructionProjectsService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('constructions:write')
  @ApiOperation({ summary: 'Atualizar obra (parcial)' })
  @ApiOkResponse({ type: ConstructionProjectResponseDto })
  @ApiNotFoundResponse({ description: 'Obra não encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConstructionProjectDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionProjectResponseDto> {
    return this.constructionProjectsService.update(
      id,
      dto,
      user.id,
      activeCongregationId,
    );
  }

  @Delete(':id')
  @RequirePermission('constructions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover obra (soft delete)' })
  @ApiNoContentResponse({ description: 'Obra removida' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.constructionProjectsService.remove(id, activeCongregationId);
  }

  @Post(':id/expenses')
  @RequirePermission('constructions:write')
  @ApiOperation({ summary: 'Registrar despesa da obra' })
  @ApiCreatedResponse({ type: ConstructionExpenseResponseDto })
  createExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConstructionExpenseDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionExpenseResponseDto> {
    return this.constructionExpensesService.create(
      id,
      dto,
      user,
      activeCongregationId,
    );
  }

  @Get(':id/expenses')
  @ApiOperation({ summary: 'Listar despesas da obra (paginado)' })
  @ApiOkResponse({ type: PaginatedConstructionExpensesResponseDto })
  findExpenses(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryConstructionExpensesDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedConstructionExpensesResponseDto> {
    return this.constructionExpensesService.findAll(
      id,
      query.page,
      query.limit,
      activeCongregationId,
    );
  }

  @Delete(':id/expenses/:entryId')
  @RequirePermission('constructions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover despesa da obra (soft delete)' })
  @ApiNoContentResponse({ description: 'Despesa removida' })
  removeExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.constructionExpensesService.remove(
      id,
      entryId,
      user,
      activeCongregationId,
    );
  }

  @Post(':id/photos')
  @RequirePermission('constructions:write')
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
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string' },
        constructionUpdateId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOperation({ summary: 'Enviar foto da obra' })
  @ApiCreatedResponse({ type: ConstructionPhotoResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'Limite de fotos ou arquivo inválido',
  })
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: StorageUploadedFile | undefined,
    @Body() dto: CreateConstructionPhotoDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ConstructionPhotoResponseDto> {
    return this.constructionPhotosService.upload(
      id,
      file,
      dto,
      user,
      activeCongregationId,
    );
  }

  @Get(':id/photos')
  @ApiOperation({ summary: 'Listar fotos da obra' })
  @ApiOkResponse({ type: PaginatedConstructionPhotosResponseDto })
  findPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryConstructionExpensesDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedConstructionPhotosResponseDto> {
    return this.constructionPhotosService.findAll(
      id,
      query.page,
      query.limit,
      activeCongregationId,
    );
  }
}
