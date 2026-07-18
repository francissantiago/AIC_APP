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
import { AddFamilyMemberDto } from './dto/add-family-member.dto';
import { BirthdayReportResponseDto } from './dto/birthday-report-item.dto';
import { CreateFamilyDto } from './dto/create-family.dto';
import {
  FamilyMemberResponseDto,
  PaginatedFamilyMembersResponseDto,
} from './dto/family-member-response.dto';
import {
  FamilyResponseDto,
  PaginatedFamiliesResponseDto,
} from './dto/family-response.dto';
import { QueryFamiliesDto } from './dto/query-families.dto';
import { QueryFamilyBirthdaysDto } from './dto/query-family-birthdays.dto';
import { QueryFamilyMembersDto } from './dto/query-family-members.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { FamiliesService } from './families.service';

@ApiTags('families')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('members:read')
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Criar família' })
  @ApiCreatedResponse({ type: FamilyResponseDto })
  @ApiConflictResponse({
    description: 'Membro já vinculado a outra família',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Responsável inválido ou de outra congregação',
  })
  create(@Body() dto: CreateFamilyDto): Promise<FamilyResponseDto> {
    return this.familiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar famílias (paginado)' })
  @ApiOkResponse({ type: PaginatedFamiliesResponseDto })
  findAll(
    @Query() query: QueryFamiliesDto,
  ): Promise<PaginatedFamiliesResponseDto> {
    return this.familiesService.findAll(query);
  }

  @Get('birthdays')
  @ApiOperation({ summary: 'Relatório de aniversários por família' })
  @ApiOkResponse({ type: BirthdayReportResponseDto })
  findBirthdays(
    @Query() query: QueryFamilyBirthdaysDto,
  ): Promise<BirthdayReportResponseDto> {
    return this.familiesService.findBirthdays(query);
  }

  @Get('by-member/:memberId')
  @ApiOperation({ summary: 'Obter família do membro' })
  @ApiOkResponse({ type: FamilyResponseDto })
  @ApiNotFoundResponse({
    description: 'Membro sem família ou membro não encontrado',
  })
  findByMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<FamilyResponseDto> {
    return this.familiesService.findByMemberId(memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar família' })
  @ApiQuery({
    name: 'includeMembers',
    required: false,
    type: Boolean,
    description: 'Inclui membersCount no detalhe',
  })
  @ApiOkResponse({ type: FamilyResponseDto })
  @ApiNotFoundResponse({ description: 'Família não encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeMembers', new ParseBoolPipe({ optional: true }))
    includeMembers?: boolean,
  ): Promise<FamilyResponseDto> {
    return this.familiesService.findOne(id, includeMembers === true);
  }

  @Patch(':id')
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Atualizar família (parcial)' })
  @ApiOkResponse({ type: FamilyResponseDto })
  @ApiNotFoundResponse({ description: 'Família não encontrada' })
  @ApiConflictResponse({
    description: 'Membro já vinculado a outra família',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Responsável inválido ou de outra congregação',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFamilyDto,
  ): Promise<FamilyResponseDto> {
    return this.familiesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('members:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover família (soft delete + limpa vínculos)',
  })
  @ApiNoContentResponse({ description: 'Família removida' })
  @ApiNotFoundResponse({ description: 'Família não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.familiesService.remove(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Listar membros da família' })
  @ApiOkResponse({ type: PaginatedFamilyMembersResponseDto })
  @ApiNotFoundResponse({ description: 'Família não encontrada' })
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryFamilyMembersDto,
  ): Promise<PaginatedFamilyMembersResponseDto> {
    return this.familiesService.findMembers(id, query);
  }

  @Post(':id/members')
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Vincular membro à família' })
  @ApiCreatedResponse({ type: FamilyMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Família ou membro não encontrado' })
  @ApiConflictResponse({
    description: 'Membro já vinculado a esta ou outra família',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Membro de outra congregação',
  })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    return this.familiesService.addMember(id, dto);
  }

  @Patch(':id/members/:memberId')
  @RequirePermission('members:write')
  @ApiOperation({ summary: 'Alterar relação do membro na família' })
  @ApiOkResponse({ type: FamilyMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  updateMemberRelation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    return this.familiesService.updateMemberRelation(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermission('members:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desvincular membro da família' })
  @ApiNoContentResponse({ description: 'Vínculo removido' })
  @ApiNotFoundResponse({ description: 'Vínculo não encontrado' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.familiesService.removeMember(id, memberId);
  }
}
