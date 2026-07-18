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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementsBoardResponseDto,
  PaginatedAnnouncementsResponseDto,
} from './dto/paginated-announcements-response.dto';
import { QueryAnnouncementsBoardDto } from './dto/query-announcements-board.dto';
import { QueryAnnouncementsDto } from './dto/query-announcements.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('announcements:read')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @RequirePermission('announcements:write')
  @ApiOperation({ summary: 'Criar aviso interno' })
  @ApiCreatedResponse({ type: AnnouncementResponseDto })
  @ApiBadRequestResponse({
    description: 'expiresAt inválido ou payload inválido',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Audience não suportada no MVP ou targets inválidos',
  })
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<AnnouncementResponseDto> {
    return this.announcementsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar avisos (admin, paginado)' })
  @ApiOkResponse({ type: PaginatedAnnouncementsResponseDto })
  findAll(
    @Query() query: QueryAnnouncementsDto,
  ): Promise<PaginatedAnnouncementsResponseDto> {
    return this.announcementsService.findAll(query);
  }

  @Get('board')
  @ApiOperation({ summary: 'Listar avisos ativos do mural' })
  @ApiOkResponse({ type: AnnouncementsBoardResponseDto })
  findBoard(
    @Query() query: QueryAnnouncementsBoardDto,
  ): Promise<AnnouncementsBoardResponseDto> {
    return this.announcementsService.findBoard(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar aviso' })
  @ApiOkResponse({ type: AnnouncementResponseDto })
  @ApiNotFoundResponse({ description: 'Aviso não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AnnouncementResponseDto> {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('announcements:write')
  @ApiOperation({ summary: 'Atualizar aviso (parcial)' })
  @ApiOkResponse({ type: AnnouncementResponseDto })
  @ApiNotFoundResponse({ description: 'Aviso não encontrado' })
  @ApiBadRequestResponse({
    description: 'expiresAt inválido ou payload inválido',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Audience não suportada no MVP ou targets inválidos',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    return this.announcementsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('announcements:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover aviso (soft delete)' })
  @ApiNoContentResponse({ description: 'Aviso removido' })
  @ApiNotFoundResponse({ description: 'Aviso não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.announcementsService.remove(id);
  }
}
