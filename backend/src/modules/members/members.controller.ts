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
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CreateMemberDto } from './dto/create-member.dto';
import {
  MemberResponseDto,
  PaginatedMembersResponseDto,
} from './dto/member-response.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

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
