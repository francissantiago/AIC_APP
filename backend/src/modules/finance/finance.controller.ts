import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  CashFlowCsvQueryDto,
  CashFlowQueryDto,
  CashFlowReportResponseDto,
  CreateFinancialCategoryDto,
  CreateFinancialEntryDto,
  FinanceMemberOptionDto,
  FinanceMemberOptionsQueryDto,
  FinancialCategoryResponseDto,
  FinancialDashboardResponseDto,
  FinancialEntryResponseDto,
  MemberContributionsCsvQueryDto,
  MemberContributionsQueryDto,
  MemberContributionsReportDto,
  PaginatedFinancialEntriesResponseDto,
  PeriodQueryDto,
  QueryFinancialCategoriesDto,
  QueryFinancialEntriesDto,
  UpdateFinancialCategoryDto,
  UpdateFinancialEntryDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('finance:read')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obter indicadores financeiros e patrimoniais' })
  @ApiOkResponse({ type: FinancialDashboardResponseDto })
  dashboard(
    @Query() query: PeriodQueryDto,
  ): Promise<FinancialDashboardResponseDto> {
    return this.financeService.getDashboard(query);
  }

  @Get('reports/cash-flow')
  @ApiOperation({ summary: 'Gerar relatório paginado de fluxo financeiro' })
  @ApiOkResponse({ type: CashFlowReportResponseDto })
  cashFlow(
    @Query() query: CashFlowQueryDto,
  ): Promise<CashFlowReportResponseDto> {
    return this.financeService.getCashFlowReport(query);
  }

  @Get('reports/cash-flow.csv')
  @ApiOperation({ summary: 'Exportar fluxo financeiro em CSV UTF-8' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV com BOM UTF-8, limitado a 10.000 lançamentos',
    schema: { type: 'string', format: 'binary' },
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async cashFlowCsv(
    @Query() query: CashFlowCsvQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const csv = await this.financeService.exportCashFlowCsv(query);
    response
      .setHeader(
        'Content-Disposition',
        'attachment; filename="fluxo-financeiro.csv"',
      )
      .send(csv);
  }

  @Get('reports/member-contributions')
  @ApiOperation({ summary: 'Relatório de contribuições por membro e período' })
  @ApiOkResponse({ type: MemberContributionsReportDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Membro de outra congregação',
  })
  memberContributions(
    @Query() query: MemberContributionsQueryDto,
  ): Promise<MemberContributionsReportDto> {
    return this.financeService.getMemberContributions(query);
  }

  @Get('reports/member-contributions.csv')
  @ApiOperation({ summary: 'Exportar contribuições do membro em CSV UTF-8' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV com BOM UTF-8, limitado a 10.000 lançamentos',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async memberContributionsCsv(
    @Query() query: MemberContributionsCsvQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const csv = await this.financeService.exportMemberContributionsCsv(query);
    response
      .setHeader(
        'Content-Disposition',
        'attachment; filename="contribuicoes-membro.csv"',
      )
      .send(csv);
  }

  @Get('member-options')
  @ApiOperation({
    summary: 'Autocomplete de membros para vínculo em dízimo/oferta',
  })
  @ApiOkResponse({ type: FinanceMemberOptionDto, isArray: true })
  memberOptions(
    @Query() query: FinanceMemberOptionsQueryDto,
  ): Promise<FinanceMemberOptionDto[]> {
    return this.financeService.listMemberOptions(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  @ApiOkResponse({ type: FinancialCategoryResponseDto, isArray: true })
  findCategories(
    @Query() query: QueryFinancialCategoriesDto,
  ): Promise<FinancialCategoryResponseDto[]> {
    return this.financeService.findCategories(query);
  }

  @Post('categories')
  @RequirePermission('finance:write')
  @ApiOperation({ summary: 'Criar categoria financeira' })
  @ApiCreatedResponse({ type: FinancialCategoryResponseDto })
  @ApiConflictResponse({ description: 'Nome já existe para o mesmo tipo' })
  createCategory(
    @Body() dto: CreateFinancialCategoryDto,
  ): Promise<FinancialCategoryResponseDto> {
    return this.financeService.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermission('finance:write')
  @ApiOperation({ summary: 'Renomear, ativar ou desativar categoria' })
  @ApiOkResponse({ type: FinancialCategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada' })
  @ApiConflictResponse({ description: 'Nome já existe para o mesmo tipo' })
  @ApiUnprocessableEntityResponse({
    description: 'Categoria em uso não pode trocar de tipo',
  })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinancialCategoryDto,
  ): Promise<FinancialCategoryResponseDto> {
    return this.financeService.updateCategory(id, dto);
  }

  @Get('entries')
  @ApiOperation({ summary: 'Listar lançamentos financeiros' })
  @ApiOkResponse({ type: PaginatedFinancialEntriesResponseDto })
  findEntries(
    @Query() query: QueryFinancialEntriesDto,
  ): Promise<PaginatedFinancialEntriesResponseDto> {
    return this.financeService.findEntries(query);
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Detalhar lançamento financeiro' })
  @ApiOkResponse({ type: FinancialEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Lançamento não encontrado' })
  findEntry(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FinancialEntryResponseDto> {
    return this.financeService.findEntry(id);
  }

  @Post('entries')
  @RequirePermission('finance:write')
  @ApiOperation({ summary: 'Criar lançamento financeiro realizado' })
  @ApiCreatedResponse({ type: FinancialEntryResponseDto })
  @ApiNotFoundResponse({
    description: 'Categoria ou membro não encontrado',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Categoria inativa/incompatível, ou vínculo de membro inválido',
  })
  createEntry(
    @Body() dto: CreateFinancialEntryDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<FinancialEntryResponseDto> {
    return this.financeService.createEntry(dto, user);
  }

  @Patch('entries/:id')
  @RequirePermission('finance:write')
  @ApiOperation({ summary: 'Atualizar lançamento financeiro' })
  @ApiOkResponse({ type: FinancialEntryResponseDto })
  @ApiNotFoundResponse({
    description: 'Lançamento, categoria ou membro não encontrado',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Categoria inativa/incompatível, ou vínculo de membro inválido',
  })
  updateEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ): Promise<FinancialEntryResponseDto> {
    return this.financeService.updateEntry(id, dto);
  }

  @Delete('entries/:id')
  @RequirePermission('finance:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover lançamento por soft delete' })
  @ApiNoContentResponse({ description: 'Lançamento removido' })
  @ApiNotFoundResponse({ description: 'Lançamento não encontrado' })
  removeEntry(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.financeService.removeEntry(id);
  }
}
