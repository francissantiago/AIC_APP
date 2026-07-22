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
  ApiConflictResponse,
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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { MemberClassSummaryDto } from '../classes/dto/class-enrollment-response.dto';
import { ClassesService } from '../classes/classes.service';
import { MinistryResponseDto } from '../ministries/dto/ministry-response.dto';
import { MinistriesService } from '../ministries/ministries.service';
import { UploadedFile as MemberUploadedFile } from '../secretariat/storage/uploaded-file.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { MemberOptionDto } from './dto/member-option.dto';
import {
  MemberResponseDto,
  PaginatedMembersResponseDto,
} from './dto/member-response.dto';
import { QueryMemberOptionsDto } from './dto/query-member-options.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

const DEFAULT_UPLOAD_MAX_BYTES = 10_485_760;

function resolveUploadMaxBytes(): number {
  const parsed = Number(process.env.UPLOAD_MAX_BYTES);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_UPLOAD_MAX_BYTES;
}

@ApiTags('members')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('members:read')
@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly ministriesService: MinistriesService,
    private readonly classesService: ClassesService,
  ) {}

  @Post()
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Criar membro' })
  @ApiCreatedResponse({ type: MemberResponseDto })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  @ApiUnprocessableEntityResponse({
    description: 'userId aponta para usuário inexistente',
  })
  create(
    @Body() dto: CreateMemberDto,
    @ActiveCongregation() activeCongregationId: string | undefined,
    @CurrentUser() user: UserResponseDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.create(dto, activeCongregationId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar membros (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedMembersResponseDto })
  findAll(
    @Query() query: QueryMembersDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedMembersResponseDto> {
    return this.membersService.findAll(query, activeCongregationId);
  }

  @Get('options')
  @ApiOperation({
    summary:
      'Autocomplete leve de membros (filiação). Mínimo 3 caracteres; active+inactive.',
  })
  @ApiOkResponse({ type: MemberOptionDto, isArray: true })
  listOptions(
    @Query() query: QueryMemberOptionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MemberOptionDto[]> {
    return this.membersService.listOptions(query, activeCongregationId);
  }

  @Get(':id/ministries')
  @RequirePermission('ministries:read')
  @ApiOperation({ summary: 'Listar ministérios do membro' })
  @ApiOkResponse({ type: MinistryResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  findMinistries(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MinistryResponseDto[]> {
    return this.ministriesService.findByMemberId(id, activeCongregationId);
  }

  @Get(':id/classes')
  @RequirePermission('classes:read')
  @ApiOperation({ summary: 'Listar turmas EBD do membro' })
  @ApiOkResponse({ type: MemberClassSummaryDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  findClasses(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MemberClassSummaryDto[]> {
    return this.classesService.findByMemberId(id, activeCongregationId);
  }

  @Get(':id/photo')
  @RequirePermission('members:read', 'membership-cards:read')
  @ApiOperation({ summary: 'Obter foto do membro' })
  @ApiProduces('image/png', 'image/jpeg')
  @ApiOkResponse({
    description: 'Stream da foto do membro',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Membro ou foto não encontrado' })
  async getPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const file = await this.membersService.getPhotoStream(
      id,
      activeCongregationId,
    );
    response.setHeader('Content-Type', file.mimeType);
    file.stream.pipe(response);
  }

  @Post(':id/photo')
  @RequirePermission('members:write')
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
          description: 'Foto do membro (PNG ou JPEG). Campo multipart: file.',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Enviar ou substituir foto do membro' })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  @ApiBadRequestResponse({
    description: 'Arquivo ausente, tipo inválido ou tamanho excedido',
  })
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: MemberUploadedFile | undefined,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MemberResponseDto> {
    return this.membersService.uploadPhoto(id, file, activeCongregationId);
  }

  @Delete(':id/photo')
  @RequirePermission('members:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover foto do membro' })
  @ApiNoContentResponse({ description: 'Foto removida' })
  @ApiNotFoundResponse({ description: 'Membro ou foto não encontrado' })
  removePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.membersService.removePhoto(id, activeCongregationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar membro' })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<MemberResponseDto> {
    return this.membersService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Atualizar membro (parcial)' })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  @ApiUnprocessableEntityResponse({
    description: 'userId aponta para usuário inexistente',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
    @ActiveCongregation() activeCongregationId: string | undefined,
    @CurrentUser() user: UserResponseDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.update(id, dto, activeCongregationId, user.id);
  }

  @Delete(':id')
  @RequirePermission('members:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro (soft delete via deleted_at)' })
  @ApiNoContentResponse({ description: 'Membro removido' })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId: string | undefined,
    @CurrentUser() user: UserResponseDto,
  ): Promise<void> {
    return this.membersService.remove(id, activeCongregationId, user.id);
  }
}
