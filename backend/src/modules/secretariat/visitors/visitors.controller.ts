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
  CreateVisitorDto,
  PaginatedVisitorsResponseDto,
  QueryVisitorsDto,
  UpdateVisitorDto,
  VisitorResponseDto,
} from '../dto/secretariat.dto';
import { VisitorsService } from './visitors.service';

const READ_ROLES = ['ADMIN', 'PASTOR', 'SECRETARY'];
const WRITE_ROLES = ['ADMIN', 'SECRETARY'];

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...READ_ROLES)
@Controller('secretariat/visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar visitantes' })
  @ApiOkResponse({ type: PaginatedVisitorsResponseDto })
  findVisitors(
    @Query() query: QueryVisitorsDto,
  ): Promise<PaginatedVisitorsResponseDto> {
    return this.visitorsService.findVisitors(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar visitante' })
  @ApiOkResponse({ type: VisitorResponseDto })
  @ApiNotFoundResponse({ description: 'Visitante não encontrado' })
  findVisitor(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VisitorResponseDto> {
    return this.visitorsService.findVisitor(id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cadastrar visitante' })
  @ApiCreatedResponse({ type: VisitorResponseDto })
  createVisitor(
    @Body() dto: CreateVisitorDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<VisitorResponseDto> {
    return this.visitorsService.createVisitor(dto, user);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Atualizar visitante' })
  @ApiOkResponse({ type: VisitorResponseDto })
  @ApiNotFoundResponse({ description: 'Visitante não encontrado' })
  updateVisitor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitorDto,
  ): Promise<VisitorResponseDto> {
    return this.visitorsService.updateVisitor(id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover visitante por soft delete' })
  @ApiNoContentResponse({ description: 'Visitante removido' })
  @ApiNotFoundResponse({ description: 'Visitante não encontrado' })
  removeVisitor(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.visitorsService.removeVisitor(id);
  }
}
