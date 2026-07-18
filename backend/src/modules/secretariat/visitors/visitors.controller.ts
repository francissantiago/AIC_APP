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
import { ApiErrorResponses } from '../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CreateVisitorDto,
  ConvertVisitorToMemberDto,
  ConvertVisitorToMemberResponseDto,
  PaginatedVisitorsResponseDto,
  QueryVisitorsDto,
  UpdateVisitorDto,
  VisitorResponseDto,
} from '../dto/secretariat.dto';
import { VisitorsService } from './visitors.service';

@ApiTags('Secretariat')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@ApiBadRequestResponse({ description: 'Payload ou filtro inválido' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('secretariat:read')
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
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Cadastrar visitante' })
  @ApiCreatedResponse({ type: VisitorResponseDto })
  createVisitor(
    @Body() dto: CreateVisitorDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<VisitorResponseDto> {
    return this.visitorsService.createVisitor(dto, user);
  }

  @Patch(':id')
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Atualizar visitante' })
  @ApiOkResponse({ type: VisitorResponseDto })
  @ApiNotFoundResponse({ description: 'Visitante não encontrado' })
  updateVisitor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitorDto,
  ): Promise<VisitorResponseDto> {
    return this.visitorsService.updateVisitor(id, dto);
  }

  @Post(':id/convert-to-member')
  @RequirePermission('secretariat:write')
  @ApiOperation({ summary: 'Converter visitante em membro (transacional)' })
  @ApiCreatedResponse({ type: ConvertVisitorToMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Visitante não encontrado' })
  convertToMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertVisitorToMemberDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<ConvertVisitorToMemberResponseDto> {
    return this.visitorsService.convertToMember(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('secretariat:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover visitante por soft delete' })
  @ApiNoContentResponse({ description: 'Visitante removido' })
  @ApiNotFoundResponse({ description: 'Visitante não encontrado' })
  removeVisitor(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.visitorsService.removeVisitor(id);
  }
}
