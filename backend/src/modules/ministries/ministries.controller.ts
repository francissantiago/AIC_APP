import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AddMinistryMemberDto } from './dto/add-ministry-member.dto';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import {
  MinistryMemberResponseDto,
  PaginatedMinistryMembersResponseDto,
} from './dto/ministry-member-response.dto';
import {
  MinistryResponseDto,
  PaginatedMinistriesResponseDto,
} from './dto/ministry-response.dto';
import { QueryMinistriesDto } from './dto/query-ministries.dto';
import { QueryMinistryMembersDto } from './dto/query-ministry-members.dto';
import { UpdateMinistryMemberDto } from './dto/update-ministry-member.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { MinistriesService } from './ministries.service';

@ApiTags('ministries')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('ministries:read')
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Post()
  @RequirePermission('ministries:write')
  @ApiOperation({ summary: 'Criar ministério' })
  @ApiCreatedResponse({ type: MinistryResponseDto })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Líder inválido ou de outra congregação',
  })
  create(@Body() dto: CreateMinistryDto): Promise<MinistryResponseDto> {
    return this.ministriesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar ministérios (paginado, com filtros)',
  })
  @ApiOkResponse({ type: PaginatedMinistriesResponseDto })
  findAll(
    @Query() query: QueryMinistriesDto,
  ): Promise<PaginatedMinistriesResponseDto> {
    return this.ministriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar ministério' })
  @ApiQuery({
    name: 'includeMembers',
    required: false,
    type: Boolean,
    description: 'Inclui membersCount no detalhe',
  })
  @ApiOkResponse({ type: MinistryResponseDto })
  @ApiNotFoundResponse({ description: 'Ministério não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeMembers', new ParseBoolPipe({ optional: true }))
    includeMembers?: boolean,
  ): Promise<MinistryResponseDto> {
    return this.ministriesService.findOne(id, includeMembers === true);
  }

  @Patch(':id')
  @RequirePermission('ministries:write')
  @ApiOperation({ summary: 'Atualizar ministério (parcial)' })
  @ApiOkResponse({ type: MinistryResponseDto })
  @ApiNotFoundResponse({ description: 'Ministério não encontrado' })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Líder inválido ou de outra congregação',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMinistryDto,
  ): Promise<MinistryResponseDto> {
    return this.ministriesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('ministries:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ministério (soft delete)' })
  @ApiNoContentResponse({ description: 'Ministério removido' })
  @ApiNotFoundResponse({ description: 'Ministério não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ministriesService.remove(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Listar membros do ministério' })
  @ApiOkResponse({ type: PaginatedMinistryMembersResponseDto })
  @ApiNotFoundResponse({ description: 'Ministério não encontrado' })
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMinistryMembersDto,
  ): Promise<PaginatedMinistryMembersResponseDto> {
    return this.ministriesService.findMembers(id, query);
  }

  @Post(':id/members')
  @RequirePermission('ministries:write')
  @ApiOperation({ summary: 'Vincular membro ao ministério' })
  @ApiCreatedResponse({ type: MinistryMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Ministério ou membro não encontrado' })
  @ApiConflictResponse({ description: 'Membro já vinculado' })
  @ApiUnprocessableEntityResponse({
    description: 'Membro de outra congregação',
  })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMinistryMemberDto,
  ): Promise<MinistryMemberResponseDto> {
    return this.ministriesService.addMember(id, dto);
  }

  @Patch(':id/members/:memberId')
  @RequirePermission('ministries:write')
  @ApiOperation({ summary: 'Alterar papel do membro no ministério' })
  @ApiOkResponse({ type: MinistryMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMinistryMemberDto,
  ): Promise<MinistryMemberResponseDto> {
    return this.ministriesService.updateMemberRole(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('ministries:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincular membro do ministério' })
  @ApiNoContentResponse({ description: 'Vínculo removido' })
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.ministriesService.removeMember(id, memberId);
  }
}
