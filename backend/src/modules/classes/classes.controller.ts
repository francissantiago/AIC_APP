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
import {
  ClassResponseDto,
  ClassTeacherOptionDto,
  PaginatedClassesResponseDto,
} from './dto/class-response.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { QueryTeacherOptionsDto } from './dto/query-teacher-options.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassesService } from './classes.service';

@ApiTags('classes')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  create(@Body() dto: CreateClassDto): Promise<ClassResponseDto> {
    return this.classesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar turmas da EBD (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedClassesResponseDto })
  findAll(
    @Query() query: QueryClassesDto,
  ): Promise<PaginatedClassesResponseDto> {
    return this.classesService.findAll(query);
  }

  @Get('teacher-options')
  @ApiOperation({
    summary: 'Opções de professor (membros ativos da congregação)',
  })
  @ApiOkResponse({ type: ClassTeacherOptionDto, isArray: true })
  teacherOptions(
    @Query() query: QueryTeacherOptionsDto,
  ): Promise<ClassTeacherOptionDto[]> {
    return this.classesService.listTeacherOptions(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar turma da EBD' })
  @ApiOkResponse({ type: ClassResponseDto })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClassResponseDto> {
    return this.classesService.findOne(id);
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
  ): Promise<ClassResponseDto> {
    return this.classesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('classes:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover turma da EBD (soft delete)' })
  @ApiNoContentResponse({ description: 'Turma removida' })
  @ApiNotFoundResponse({ description: 'Turma não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.classesService.remove(id);
  }
}
