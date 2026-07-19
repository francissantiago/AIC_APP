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
  Put,
  Query,
  Res,
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
import { AddClassEnrollmentDto } from './dto/add-class-enrollment.dto';
import { ClassSessionAttendanceDto } from './dto/class-attendance-response.dto';
import {
  ClassEnrollmentOptionDto,
  ClassEnrollmentResponseDto,
  PaginatedClassEnrollmentsResponseDto,
} from './dto/class-enrollment-response.dto';
import { ClassFrequencyReportDto } from './dto/class-frequency-response.dto';
import {
  ClassResponseDto,
  ClassTeacherOptionDto,
  PaginatedClassesResponseDto,
} from './dto/class-response.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassEnrollmentsDto } from './dto/query-class-enrollments.dto';
import { QueryClassFrequencyDto } from './dto/query-class-frequency.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { QueryEnrollmentOptionsDto } from './dto/query-enrollment-options.dto';
import { QuerySessionAttendanceDto } from './dto/query-session-attendance.dto';
import { QueryTeacherOptionsDto } from './dto/query-teacher-options.dto';
import { UpdateClassEnrollmentDto } from './dto/update-class-enrollment.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpsertClassAttendanceDto } from './dto/upsert-class-attendance.dto';
import { ClassesService } from './classes.service';

@ApiTags('classes')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('classes:read')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @RequirePermission('classes:write')
  @ApiOperation({ summary: 'Criar turma da EBD' })
  @ApiCreatedResponse({ type: ClassResponseDto })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiNotFoundResponse({ description: 'Professor não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'Professor de outra congregação',
  })
  create(
    @Body() dto: CreateClassDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassResponseDto> {
    return this.classesService.create(dto, activeCongregationId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar turmas da EBD (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedClassesResponseDto })
  findAll(
    @Query() query: QueryClassesDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedClassesResponseDto> {
    return this.classesService.findAll(query, activeCongregationId);
  }

  @Get('teacher-options')
  @ApiOperation({
    summary: 'Opções de professor (membros ativos da congregação)',
  })
  @ApiOkResponse({ type: ClassTeacherOptionDto, isArray: true })
  teacherOptions(
    @Query() query: QueryTeacherOptionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassTeacherOptionDto[]> {
    return this.classesService.listTeacherOptions(query, activeCongregationId);
  }

  @Get(':id/enrollment-options')
  @ApiOperation({
    summary:
      'Opções de aluno para matrícula (ativos da congregação ainda não matriculados)',
  })
  @ApiOkResponse({ type: ClassEnrollmentOptionDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  enrollmentOptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryEnrollmentOptionsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassEnrollmentOptionDto[]> {
    return this.classesService.listEnrollmentOptions(
      id,
      query,
      activeCongregationId,
    );
  }

  @Get(':id/enrollments')
  @ApiOperation({ summary: 'Listar matrículas da turma' })
  @ApiOkResponse({ type: PaginatedClassEnrollmentsResponseDto })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  findEnrollments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryClassEnrollmentsDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<PaginatedClassEnrollmentsResponseDto> {
    return this.classesService.findEnrollments(id, query, activeCongregationId);
  }

  @Post(':id/enrollments')
  @RequirePermission('classes:write')
  @ApiOperation({ summary: 'Matricular aluno na turma' })
  @ApiCreatedResponse({ type: ClassEnrollmentResponseDto })
  @ApiNotFoundResponse({ description: 'Turma ou membro não encontrado' })
  @ApiConflictResponse({ description: 'Membro já matriculado' })
  @ApiUnprocessableEntityResponse({
    description: 'Membro de outra congregação',
  })
  addEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddClassEnrollmentDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassEnrollmentResponseDto> {
    return this.classesService.addEnrollment(id, dto, activeCongregationId);
  }

  @Patch(':id/enrollments/:memberId')
  @RequirePermission('classes:write')
  @ApiOperation({ summary: 'Alterar status da matrícula' })
  @ApiOkResponse({ type: ClassEnrollmentResponseDto })
  @ApiNotFoundResponse({ description: 'Matrícula não encontrada' })
  updateEnrollmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateClassEnrollmentDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassEnrollmentResponseDto> {
    return this.classesService.updateEnrollmentStatus(
      id,
      memberId,
      dto,
      activeCongregationId,
    );
  }

  @Delete(':id/enrollments/:memberId')
  @RequirePermission('classes:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desmatricular aluno (hard delete do vínculo)' })
  @ApiNoContentResponse({ description: 'Matrícula removida' })
  @ApiNotFoundResponse({ description: 'Matrícula não encontrada' })
  removeEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.classesService.removeEnrollment(
      id,
      memberId,
      activeCongregationId,
    );
  }

  @Get(':id/attendance')
  @ApiOperation({
    summary: 'Folha da chamada da sessão (matrículas active + merge)',
  })
  @ApiOkResponse({ type: ClassSessionAttendanceDto })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  getSessionAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QuerySessionAttendanceDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassSessionAttendanceDto> {
    return this.classesService.getSessionAttendance(
      id,
      query,
      activeCongregationId,
    );
  }

  @Put(':id/attendance')
  @RequirePermission('classes:write')
  @ApiOperation({
    summary: 'Salvar chamada da sessão (upsert parcial por aluno)',
  })
  @ApiOkResponse({ type: ClassSessionAttendanceDto })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @ApiUnprocessableEntityResponse({
    description: 'Aluno sem matrícula active ou entries vazias',
  })
  upsertSessionAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertClassAttendanceDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassSessionAttendanceDto> {
    return this.classesService.upsertSessionAttendance(
      id,
      dto,
      activeCongregationId,
    );
  }

  @Get(':id/reports/frequency.csv')
  @ApiOperation({ summary: 'Exportar frequência da turma em CSV UTF-8' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV com BOM UTF-8',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @ApiUnprocessableEntityResponse({
    description: 'Período inválido (ordem ou > 24 meses)',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async frequencyCsv(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryClassFrequencyDto,
    @Res() response: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const csv = await this.classesService.exportFrequencyCsv(
      id,
      query,
      activeCongregationId,
    );
    response
      .setHeader(
        'Content-Disposition',
        `attachment; filename="ebd-frequency-${id}-${query.from}-${query.to}.csv"`,
      )
      .send(csv);
  }

  @Get(':id/reports/frequency')
  @ApiOperation({ summary: 'Relatório de frequência da turma por período' })
  @ApiOkResponse({ type: ClassFrequencyReportDto })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  @ApiUnprocessableEntityResponse({
    description: 'Período inválido (ordem ou > 24 meses)',
  })
  frequencyReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryClassFrequencyDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassFrequencyReportDto> {
    return this.classesService.getFrequencyReport(
      id,
      query,
      activeCongregationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar turma da EBD' })
  @ApiOkResponse({ type: ClassResponseDto })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassResponseDto> {
    return this.classesService.findOne(id, activeCongregationId);
  }

  @Patch(':id')
  @RequirePermission('classes:write')
  @ApiOperation({ summary: 'Atualizar turma da EBD (parcial)' })
  @ApiOkResponse({ type: ClassResponseDto })
  @ApiNotFoundResponse({ description: 'Turma ou professor não encontrado' })
  @ApiConflictResponse({ description: 'Nome já em uso na congregação' })
  @ApiUnprocessableEntityResponse({
    description: 'Professor de outra congregação',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassDto,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<ClassResponseDto> {
    return this.classesService.update(id, dto, activeCongregationId);
  }

  @Delete(':id')
  @RequirePermission('classes:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover turma da EBD (soft delete)' })
  @ApiNoContentResponse({ description: 'Turma removida' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.classesService.remove(id, activeCongregationId);
  }
}
