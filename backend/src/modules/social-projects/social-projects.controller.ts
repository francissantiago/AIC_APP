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
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AddSocialProjectMemberDto } from './dto/add-social-project-member.dto';
import { CreateSocialProjectDto } from './dto/create-social-project.dto';
import { CreateSocialProjectExpenseDto } from './dto/create-social-project-expense.dto';
import { QuerySocialProjectExpensesDto } from './dto/query-social-project-expenses.dto';
import { QuerySocialProjectMembersDto } from './dto/query-social-project-members.dto';
import { QuerySocialProjectsDto } from './dto/query-social-projects.dto';
import {
  PaginatedSocialProjectExpensesResponseDto,
  SocialProjectExpenseResponseDto,
} from './dto/social-project-expense-response.dto';
import {
  PaginatedSocialProjectMembersResponseDto,
  SocialProjectMemberResponseDto,
} from './dto/social-project-member-response.dto';
import {
  PaginatedSocialProjectsResponseDto,
  SocialProjectResponseDto,
} from './dto/social-project-response.dto';
import { UpdateSocialProjectMemberDto } from './dto/update-social-project-member.dto';
import { UpdateSocialProjectDto } from './dto/update-social-project.dto';
import { SocialProjectExpensesService } from './social-project-expenses.service';
import { SocialProjectsService } from './social-projects.service';

@ApiTags('social-projects')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('social-projects:read')
@Controller('social-projects')
export class SocialProjectsController {
  constructor(
    private readonly socialProjectsService: SocialProjectsService,
    private readonly socialProjectExpensesService: SocialProjectExpensesService,
  ) {}

  @Post()
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Criar projeto social' })
  @ApiCreatedResponse({ type: SocialProjectResponseDto })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  create(
    @Body() dto: CreateSocialProjectDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectResponseDto> {
    return this.socialProjectsService.create(dto, activeCongregationId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar projetos sociais (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedSocialProjectsResponseDto })
  findAll(
    @Query() query: QuerySocialProjectsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectsResponseDto> {
    return this.socialProjectsService.findAll(query, activeCongregationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar projeto social' })
  @ApiQuery({
    name: 'includeMembersCount',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeSessionsCount',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeExpensesCount',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({ type: SocialProjectResponseDto })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeMembersCount', new ParseBoolPipe({ optional: true }))
    includeMembersCount?: boolean,
    @Query('includeSessionsCount', new ParseBoolPipe({ optional: true }))
    includeSessionsCount?: boolean,
    @Query('includeExpensesCount', new ParseBoolPipe({ optional: true }))
    includeExpensesCount?: boolean,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectResponseDto> {
    return this.socialProjectsService.findOne(
      id,
      {
        includeMembersCount: includeMembersCount === true,
        includeSessionsCount: includeSessionsCount === true,
        includeExpensesCount: includeExpensesCount === true,
      },
      activeCongregationId,
    );
  }

  @Patch(':id')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Atualizar projeto social (parcial)' })
  @ApiOkResponse({ type: SocialProjectResponseDto })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado' })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSocialProjectDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectResponseDto> {
    return this.socialProjectsService.update(
      id,
      dto,
      user.id,
      activeCongregationId,
    );
  }

  @Delete(':id')
  @RequirePermission('social-projects:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover projeto social (soft delete)' })
  @ApiNoContentResponse({ description: 'Projeto removido' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.socialProjectsService.remove(id, activeCongregationId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Listar participantes do projeto' })
  @ApiOkResponse({ type: PaginatedSocialProjectMembersResponseDto })
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySocialProjectMembersDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectMembersResponseDto> {
    return this.socialProjectsService.findMembers(
      id,
      query,
      activeCongregationId,
    );
  }

  @Post(':id/members')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Vincular participante ao projeto' })
  @ApiCreatedResponse({ type: SocialProjectMemberResponseDto })
  @ApiConflictResponse({ description: 'Membro já vinculado' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSocialProjectMemberDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectMemberResponseDto> {
    return this.socialProjectsService.addMember(
      id,
      dto,
      user.id,
      activeCongregationId,
    );
  }

  @Patch(':id/members/:memberId')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Alterar papel do participante' })
  @ApiOkResponse({ type: SocialProjectMemberResponseDto })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateSocialProjectMemberDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectMemberResponseDto> {
    return this.socialProjectsService.updateMemberRole(
      id,
      memberId,
      dto,
      activeCongregationId,
    );
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('social-projects:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincular participante do projeto' })
  @ApiNoContentResponse({ description: 'Vínculo removido' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.socialProjectsService.removeMember(
      id,
      memberId,
      activeCongregationId,
    );
  }

  @Post(':id/expenses')
  @RequirePermission('social-projects:write')
  @ApiOperation({ summary: 'Registrar despesa do projeto social' })
  @ApiCreatedResponse({ type: SocialProjectExpenseResponseDto })
  createExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSocialProjectExpenseDto,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<SocialProjectExpenseResponseDto> {
    return this.socialProjectExpensesService.create(
      id,
      dto,
      user,
      activeCongregationId,
    );
  }

  @Get(':id/expenses')
  @ApiOperation({ summary: 'Listar despesas do projeto (paginado)' })
  @ApiOkResponse({ type: PaginatedSocialProjectExpensesResponseDto })
  findExpenses(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySocialProjectExpensesDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectExpensesResponseDto> {
    return this.socialProjectExpensesService.findAll(
      id,
      query.page,
      query.limit,
      activeCongregationId,
    );
  }

  @Delete(':id/expenses/:entryId')
  @RequirePermission('social-projects:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover despesa do projeto (soft delete)' })
  @ApiNoContentResponse({ description: 'Despesa removida' })
  removeExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: UserResponseDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.socialProjectExpensesService.remove(
      id,
      entryId,
      user,
      activeCongregationId,
    );
  }
}
