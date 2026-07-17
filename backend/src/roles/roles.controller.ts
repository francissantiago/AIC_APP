import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleResponseDto } from './dto/role-response.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de níveis de acesso (roles)' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }
}
