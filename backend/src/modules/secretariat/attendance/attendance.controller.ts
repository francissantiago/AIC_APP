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
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  AttendanceRecordResponseDto,
  CreateAttendanceRecordDto,
  PaginatedAttendanceResponseDto,
  QueryAttendanceDto,
  UpdateAttendanceRecordDto,
} from '../dto/secretariat.dto';
import { AttendanceService } from './attendance.service';

const READ_ROLES = ['ADMIN', 'PASTOR', 'SECRETARY'];
const WRITE_ROLES = ['ADMIN', 'SECRETARY'];

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('secretariat/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de presença' })
  @ApiOkResponse({ type: PaginatedAttendanceResponseDto })
  findRecords(
    @Query() query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    return this.attendanceService.findRecords(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar registro de presença' })
  @ApiOkResponse({ type: AttendanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Registro não encontrado' })
  findRecord(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceService.findRecord(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Lançar registro agregado de presença' })
  @ApiCreatedResponse({ type: AttendanceRecordResponseDto })
  createRecord(
    @Body() dto: CreateAttendanceRecordDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceService.createRecord(dto, user);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Atualizar registro de presença' })
  @ApiOkResponse({ type: AttendanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Registro não encontrado' })
  updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceRecordDto,
  ): Promise<AttendanceRecordResponseDto> {
    return this.attendanceService.updateRecord(id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover registro de presença por soft delete' })
  @ApiNoContentResponse({ description: 'Registro removido' })
  @ApiNotFoundResponse({ description: 'Registro não encontrado' })
  removeRecord(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.attendanceService.removeRecord(id);
  }
}
