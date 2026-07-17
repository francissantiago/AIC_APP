import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  const rolesRepository = {
    find: jest.fn(),
  };

  const adminRole: Role = {
    id: 1,
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
      ],
    }).compile();

    service = module.get(RolesService);
  });

  it('deve listar o catálogo de roles ordenado por id', async () => {
    rolesRepository.find.mockResolvedValue([adminRole]);

    const result = await service.findAll();

    expect(rolesRepository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    expect(result).toEqual([
      {
        id: 1,
        code: 'ADMIN',
        name: 'Administrador',
        description: 'Acesso total ao sistema',
      },
    ]);
  });

  it('não deve expor created_at/updated_at no DTO de resposta', async () => {
    rolesRepository.find.mockResolvedValue([adminRole]);

    const [dto] = await service.findAll();

    expect(dto).not.toHaveProperty('createdAt');
    expect(dto).not.toHaveProperty('updatedAt');
  });
});
