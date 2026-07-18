import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleResponseDto } from './dto/role-response.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesRepository.find({ order: { id: 'ASC' } });
    this.logger.debug(
      `Catálogo de roles consultado (${roles.length} registros)`,
    );
    return roles.map((role) => RoleResponseDto.fromEntity(role));
  }
}
