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
  Put,
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
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('users:read')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('users:write')
  @ApiOperation({
    summary: 'Criar usuário (senha armazenada como hash bcrypt)',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'username ou email já em uso' })
  @ApiUnprocessableEntityResponse({
    description: 'roleIds contém role inexistente',
  })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuários (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  findAll(@Query() query: QueryUsersDto): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar usuário com roles' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('users:write')
  @ApiOperation({ summary: 'Atualizar email, nome completo e/ou status' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'email já em uso' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Put(':id/roles')
  @RequirePermission('users:write')
  @ApiOperation({ summary: 'Substituir o conjunto de roles do usuário' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiUnprocessableEntityResponse({
    description: 'roleIds contém role inexistente',
  })
  setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
  ): Promise<UserResponseDto> {
    return this.usersService.setRoles(id, dto);
  }

  @Delete(':id')
  @RequirePermission('users:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuário (soft delete via deleted_at)' })
  @ApiNoContentResponse({ description: 'Usuário removido' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
