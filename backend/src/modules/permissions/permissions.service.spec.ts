import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { Permission } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const permissionsRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
  };

  const financeRead: Permission = {
    id: 9,
    code: 'finance:read',
    resource: 'finance',
    action: 'read',
    description: 'Visualizar dashboard, lançamentos e categorias financeiras',
    createdAt: new Date('2026-07-18T00:00:00Z'),
    updatedAt: new Date('2026-07-18T00:00:00Z'),
  };

  const financeWrite: Permission = {
    ...financeRead,
    id: 10,
    code: 'finance:write',
    action: 'write',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionsRepository,
        },
      ],
    }).compile();

    service = module.get(PermissionsService);
  });

  it('deve listar o catálogo completo de permissões ordenado por id', async () => {
    permissionsRepository.find.mockResolvedValue([financeRead, financeWrite]);

    const result = await service.findAll();

    expect(permissionsRepository.find).toHaveBeenCalledWith({
      order: { id: 'ASC' },
    });
    expect(result).toEqual([
      {
        id: 9,
        code: 'finance:read',
        resource: 'finance',
        action: 'read',
        description:
          'Visualizar dashboard, lançamentos e categorias financeiras',
      },
      {
        id: 10,
        code: 'finance:write',
        resource: 'finance',
        action: 'write',
        description:
          'Visualizar dashboard, lançamentos e categorias financeiras',
      },
    ]);
  });

  it('deve retornar as entities quando todos os ids existem', async () => {
    permissionsRepository.findBy.mockResolvedValue([financeRead, financeWrite]);

    const result = await service.validateIds([9, 10]);

    expect(result).toEqual([financeRead, financeWrite]);
  });

  it('deve lançar 422 PERMISSIONS.NOT_FOUND quando algum id não existe', async () => {
    permissionsRepository.findBy.mockResolvedValue([financeRead]);

    await expect(service.validateIds([9, 999])).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: ApiErrorCode.PERMISSIONS_NOT_FOUND },
    });
  });

  it('deve deduplicar ids repetidos antes de validar', async () => {
    permissionsRepository.findBy.mockResolvedValue([financeRead]);

    const result = await service.validateIds([9, 9, 9]);

    expect(permissionsRepository.findBy).toHaveBeenCalledTimes(1);
    expect(result).toEqual([financeRead]);
  });
});
