import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { Permission } from '../permissions/entities/permission.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const rolesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    manager: {
      createQueryBuilder: jest.fn(() => queryBuilder),
    },
  };

  const permissionsService = {
    validateIds: jest.fn(),
  };

  const rolesWritePermission: Permission = {
    id: 4,
    code: 'roles:write',
    resource: 'roles',
    action: 'write',
    description: 'Criar, editar, excluir papéis e gerenciar suas permissões',
    createdAt: new Date('2026-07-18T00:00:00Z'),
    updatedAt: new Date('2026-07-18T00:00:00Z'),
  };

  const rolesReadPermission: Permission = {
    ...rolesWritePermission,
    id: 3,
    code: 'roles:read',
    action: 'read',
  };

  const financeReadPermission: Permission = {
    id: 9,
    code: 'finance:read',
    resource: 'finance',
    action: 'read',
    description: 'Visualizar dashboard, lançamentos e categorias financeiras',
    createdAt: new Date('2026-07-18T00:00:00Z'),
    updatedAt: new Date('2026-07-18T00:00:00Z'),
  };

  const adminRole: Role = {
    id: 1,
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
    permissions: [rolesWritePermission],
  };

  const treasurerRole: Role = {
    id: 3,
    code: 'TREASURER',
    name: 'Tesoureiro',
    description: 'Gestão financeira',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
    permissions: [rolesReadPermission, financeReadPermission],
  };

  const customRole: Role = {
    id: 10,
    code: 'VOLUNTEER',
    name: 'Voluntário',
    description: 'Apoio em eventos',
    createdAt: new Date('2026-07-18T00:00:00Z'),
    updatedAt: new Date('2026-07-18T00:00:00Z'),
    permissions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder.getRawOne.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    service = module.get(RolesService);
  });

  it('deve listar o catálogo de roles ordenado por id, com permissions', async () => {
    rolesRepository.find.mockResolvedValue([adminRole]);

    const result = await service.findAll();

    expect(rolesRepository.find).toHaveBeenCalledWith({
      order: { id: 'ASC' },
      relations: { permissions: true },
    });
    expect(result).toEqual([
      {
        id: 1,
        code: 'ADMIN',
        name: 'Administrador',
        description: 'Acesso total ao sistema',
        isSystem: true,
        permissions: [
          {
            id: 4,
            code: 'roles:write',
            resource: 'roles',
            action: 'write',
            description:
              'Criar, editar, excluir papéis e gerenciar suas permissões',
          },
        ],
      },
    ]);
  });

  it('não deve expor created_at/updated_at no DTO de resposta', async () => {
    rolesRepository.find.mockResolvedValue([adminRole]);

    const [dto] = await service.findAll();

    expect(dto).not.toHaveProperty('createdAt');
    expect(dto).not.toHaveProperty('updatedAt');
  });

  it('deve criar papel customizado sem permissionIds (sem permissão nenhuma)', async () => {
    rolesRepository.findOne.mockResolvedValue(null);
    rolesRepository.create.mockImplementation((data: Partial<Role>) => data);
    rolesRepository.save.mockResolvedValue(customRole);

    const result = await service.create({
      code: 'volunteer',
      name: 'Voluntário',
      description: 'Apoio em eventos',
    });

    expect(rolesRepository.create).toHaveBeenCalledWith({
      code: 'VOLUNTEER',
      name: 'Voluntário',
      description: 'Apoio em eventos',
      permissions: [],
    });
    expect(permissionsService.validateIds).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 10,
      code: 'VOLUNTEER',
      name: 'Voluntário',
      description: 'Apoio em eventos',
      isSystem: false,
      permissions: [],
    });
  });

  it('deve criar papel com permissionIds válido', async () => {
    rolesRepository.findOne.mockResolvedValue(null);
    permissionsService.validateIds.mockResolvedValue([financeReadPermission]);
    rolesRepository.create.mockImplementation((data: Partial<Role>) => data);
    rolesRepository.save.mockResolvedValue({
      ...customRole,
      permissions: [financeReadPermission],
    });

    const result = await service.create({
      code: 'volunteer',
      name: 'Voluntário',
      permissionIds: [9],
    });

    expect(permissionsService.validateIds).toHaveBeenCalledWith([9]);
    expect(result.permissions).toEqual([
      expect.objectContaining({ code: 'finance:read' }),
    ]);
  });

  it('deve propagar erro de create quando permissionIds contém id inexistente', async () => {
    rolesRepository.findOne.mockResolvedValue(null);
    permissionsService.validateIds.mockRejectedValue(
      new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.PERMISSIONS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.PERMISSIONS_NOT_FOUND],
      }),
    );

    await expect(
      service.create({
        code: 'VOLUNTEER',
        name: 'Voluntário',
        permissionIds: [999],
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: ApiErrorCode.PERMISSIONS_NOT_FOUND },
    });
    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('deve rejeitar create com código duplicado', async () => {
    rolesRepository.findOne.mockResolvedValue(adminRole);

    await expect(
      service.create({ code: 'ADMIN', name: 'Admin 2' }),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: { code: ApiErrorCode.ROLES_CODE_IN_USE },
    });
    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('deve atualizar nome e descrição sem alterar permissionIds', async () => {
    rolesRepository.findOne.mockResolvedValue({ ...customRole });
    rolesRepository.save.mockImplementation((role: Role) =>
      Promise.resolve(role),
    );

    const result = await service.update(10, {
      name: 'Voluntário Senior',
      description: null,
    });

    expect(permissionsService.validateIds).not.toHaveBeenCalled();
    expect(result.name).toBe('Voluntário Senior');
    expect(result.description).toBeNull();
    expect(result.code).toBe('VOLUNTEER');
    expect(result.permissions).toEqual([]);
  });

  it('deve substituir o conjunto completo de permissões ao informar permissionIds', async () => {
    rolesRepository.findOne.mockResolvedValue({
      ...customRole,
      permissions: [rolesReadPermission],
    });
    permissionsService.validateIds.mockResolvedValue([financeReadPermission]);
    rolesRepository.save.mockImplementation((role: Role) =>
      Promise.resolve(role),
    );

    const result = await service.update(10, { permissionIds: [9] });

    expect(permissionsService.validateIds).toHaveBeenCalledWith([9]);
    expect(result.permissions).toEqual([
      expect.objectContaining({ code: 'finance:read' }),
    ]);
  });

  it('deve lançar NOT_FOUND ao atualizar papel inexistente', async () => {
    rolesRepository.findOne.mockResolvedValue(null);

    await expect(service.update(999, { name: 'X' })).rejects.toThrow(
      ApiException,
    );
    await expect(service.update(999, { name: 'X' })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { code: ApiErrorCode.ROLES_NOT_FOUND },
    });
  });

  describe('invariante D5 — ADMIN sempre com roles:write', () => {
    it('deve rejeitar update do ADMIN removendo roles:write, sem persistir', async () => {
      rolesRepository.findOne.mockResolvedValue({ ...adminRole });
      permissionsService.validateIds.mockResolvedValue([financeReadPermission]);

      await expect(
        service.update(1, { permissionIds: [9] }),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.ROLES_ADMIN_REQUIRES_ROLES_WRITE },
      });
      expect(rolesRepository.save).not.toHaveBeenCalled();
    });

    it('deve permitir update do ADMIN quando roles:write permanece no conjunto', async () => {
      rolesRepository.findOne.mockResolvedValue({ ...adminRole });
      permissionsService.validateIds.mockResolvedValue([
        rolesWritePermission,
        financeReadPermission,
      ]);
      rolesRepository.save.mockImplementation((role: Role) =>
        Promise.resolve(role),
      );

      const result = await service.update(1, { permissionIds: [4, 9] });

      expect(rolesRepository.save).toHaveBeenCalled();
      expect(result.permissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'roles:write' }),
          expect.objectContaining({ code: 'finance:read' }),
        ]),
      );
    });

    it('deve permitir update de papel não-ADMIN removendo qualquer permissão, incluindo roles:write', async () => {
      rolesRepository.findOne.mockResolvedValue({ ...treasurerRole });
      permissionsService.validateIds.mockResolvedValue([]);
      rolesRepository.save.mockImplementation((role: Role) =>
        Promise.resolve(role),
      );

      const result = await service.update(3, { permissionIds: [] });

      expect(rolesRepository.save).toHaveBeenCalled();
      expect(result.permissions).toEqual([]);
    });
  });

  it('deve remover papel customizado sem vínculos', async () => {
    rolesRepository.findOne.mockResolvedValue({ ...customRole });
    queryBuilder.getRawOne.mockResolvedValue(undefined);
    rolesRepository.remove.mockResolvedValue(customRole);

    await service.remove(10);

    expect(rolesRepository.remove).toHaveBeenCalled();
  });

  it('deve bloquear remoção de papel de sistema', async () => {
    rolesRepository.findOne.mockResolvedValue({ ...adminRole });

    await expect(service.remove(1)).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: ApiErrorCode.ROLES_SYSTEM_PROTECTED },
    });
    expect(rolesRepository.remove).not.toHaveBeenCalled();
  });

  it('deve bloquear remoção quando há usuários vinculados', async () => {
    rolesRepository.findOne.mockResolvedValue({ ...customRole });
    queryBuilder.getRawOne.mockResolvedValue({ '?column?': 1 });

    await expect(service.remove(10)).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: { code: ApiErrorCode.ROLES_IN_USE },
    });
    expect(rolesRepository.remove).not.toHaveBeenCalled();
  });
});
