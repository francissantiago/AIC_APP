import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de níveis de acesso (roles)' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar papel por id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Papel não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermission('roles:write')
  @ApiOperation({ summary: 'Criar papel personalizado' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiConflictResponse({ description: 'Código de papel já em uso' })
  @ApiUnprocessableEntityResponse({
    description: 'permissionIds contém id inexistente (PERMISSIONS.NOT_FOUND)',
  })
  create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('roles:write')
  @ApiOperation({
    summary: 'Atualizar nome/descrição/permissões do papel (code imutável)',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Papel não encontrado' })
  @ApiUnprocessableEntityResponse({
    description:
      'permissionIds contém id inexistente (PERMISSIONS.NOT_FOUND) ou papel ADMIN perderia roles:write (ROLES.ADMIN_REQUIRES_ROLES_WRITE)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('roles:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover papel personalizado' })
  @ApiNoContentResponse({ description: 'Papel removido' })
  @ApiNotFoundResponse({ description: 'Papel não encontrado' })
  @ApiConflictResponse({
    description: 'Papel vinculado a usuários (ROLES.IN_USE)',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Papel de sistema protegido (ROLES.SYSTEM_PROTECTED)',
  })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.rolesService.remove(id);
  }
}
