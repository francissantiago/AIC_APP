import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { IPermission } from '@interfaces/IPermission';
import { IRole } from '@interfaces/IRole';
import { ApiErrorService } from '@services/api-error.service';
import { PermissionsService } from '@services/permissions-service';
import { RolesService } from '@services/roles-service';
import { translateServiceStub } from '../../../testing/translate-testing';
import { RoleForm } from './role-form';

const PERMISSIONS_CATALOG: IPermission[] = [
  { id: 1, code: 'users:read', resource: 'users', action: 'read', description: null },
  { id: 2, code: 'users:write', resource: 'users', action: 'write', description: null },
  { id: 3, code: 'roles:read', resource: 'roles', action: 'read', description: null },
  { id: 4, code: 'roles:write', resource: 'roles', action: 'write', description: null },
  { id: 5, code: 'members:read', resource: 'members', action: 'read', description: null },
  { id: 6, code: 'members:write', resource: 'members', action: 'write', description: null },
  {
    id: 7,
    code: 'congregations:read',
    resource: 'congregations',
    action: 'read',
    description: null,
  },
  {
    id: 8,
    code: 'congregations:write',
    resource: 'congregations',
    action: 'write',
    description: null,
  },
  { id: 9, code: 'finance:read', resource: 'finance', action: 'read', description: null },
  { id: 10, code: 'finance:write', resource: 'finance', action: 'write', description: null },
  { id: 11, code: 'assets:read', resource: 'assets', action: 'read', description: null },
  { id: 12, code: 'assets:write', resource: 'assets', action: 'write', description: null },
  {
    id: 13,
    code: 'secretariat:read',
    resource: 'secretariat',
    action: 'read',
    description: null,
  },
  {
    id: 14,
    code: 'secretariat:write',
    resource: 'secretariat',
    action: 'write',
    description: null,
  },
];

function buildRole(overrides: Partial<IRole> = {}): IRole {
  return {
    id: 1,
    code: 'TREASURER',
    name: 'Tesoureiro',
    description: null,
    isSystem: true,
    permissions: [],
    ...overrides,
  };
}

describe('RoleForm', () => {
  let component: RoleForm;
  let fixture: ComponentFixture<RoleForm>;
  let rolesService: {
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let permissionsService: { list: ReturnType<typeof vi.fn> };

  async function setup(roleId: number | null = null): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RoleForm],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: RolesService, useValue: rolesService },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    })
      .overrideComponent(RoleForm, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RoleForm);
    component = fixture.componentInstance;
    if (roleId !== null) {
      fixture.componentRef.setInput('roleId', roleId);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    rolesService = {
      getById: vi.fn().mockReturnValue(of(buildRole())),
      create: vi.fn().mockReturnValue(of(buildRole())),
      update: vi.fn().mockReturnValue(of(buildRole())),
    };
    permissionsService = {
      list: vi.fn().mockReturnValue(of(PERMISSIONS_CATALOG)),
    };
  });

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it('loads the permissions catalog and groups it by resource', async () => {
    await setup();
    expect(permissionsService.list).toHaveBeenCalled();
    expect(component.resourceGroups().length).toBe(7);
    expect(component.resourceGroups().map((g) => g.resource)).toEqual([
      'users',
      'roles',
      'members',
      'congregations',
      'finance',
      'assets',
      'secretariat',
    ]);
  });

  it('shows a load error hint when the permissions catalog fails to load', async () => {
    permissionsService.list.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await setup();
    expect(component.permissionsLoadError()).toBe(true);
  });

  it('pre-checks permissions already granted to the role in edit mode', async () => {
    rolesService.getById.mockReturnValue(
      of(
        buildRole({
          code: 'TREASURER',
          permissions: [PERMISSIONS_CATALOG[8], PERMISSIONS_CATALOG[9]],
        }),
      ),
    );

    await setup(1);

    expect(component.isPermissionChecked(PERMISSIONS_CATALOG[8])).toBe(true);
    expect(component.isPermissionChecked(PERMISSIONS_CATALOG[9])).toBe(true);
    expect(component.isPermissionChecked(PERMISSIONS_CATALOG[12])).toBe(false);
  });

  it('maps checked permissions to permissionIds on create', async () => {
    await setup();
    component.togglePermission(PERMISSIONS_CATALOG[8]);
    component.togglePermission(PERMISSIONS_CATALOG[9]);

    component.form.setValue({ code: 'VOLUNTEER', name: 'Voluntário', description: '' });
    component.submit();

    expect(rolesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VOLUNTEER',
        name: 'Voluntário',
        permissionIds: [9, 10],
      }),
    );
  });

  it('sends the replaced permissionIds set on update', async () => {
    rolesService.getById.mockReturnValue(
      of(buildRole({ code: 'TREASURER', permissions: [PERMISSIONS_CATALOG[8]] })),
    );
    await setup(1);

    component.togglePermission(PERMISSIONS_CATALOG[9]);
    component.form.controls.name.setValue('Tesoureiro Sênior');
    component.submit();

    expect(rolesService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ permissionIds: [9, 10] }),
    );
  });

  it('disables and force-checks roles:write when editing the ADMIN role', async () => {
    rolesService.getById.mockReturnValue(
      of(buildRole({ code: 'ADMIN', permissions: [PERMISSIONS_CATALOG[8]] })),
    );
    await setup(1);

    const rolesWrite = PERMISSIONS_CATALOG[3];
    expect(component.isPermissionDisabled(rolesWrite)).toBe(true);
    expect(component.isPermissionChecked(rolesWrite)).toBe(true);

    component.togglePermission(rolesWrite);
    expect(component.isPermissionChecked(rolesWrite)).toBe(true);
  });

  it('always includes roles:write in the payload when saving the ADMIN role', async () => {
    rolesService.getById.mockReturnValue(
      of(buildRole({ code: 'ADMIN', permissions: [PERMISSIONS_CATALOG[8]] })),
    );
    await setup(1);

    component.form.controls.name.setValue('Administrador');
    component.submit();

    expect(rolesService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ permissionIds: expect.arrayContaining([4, 9]) }),
    );
  });

  it('shows the translated feedback for PERMISSIONS.NOT_FOUND on save', async () => {
    await setup();
    const apiError = TestBed.inject(ApiErrorService);
    vi.spyOn(apiError, 'resolve').mockReturnValue({
      statusCode: 422,
      code: 'PERMISSIONS.NOT_FOUND',
      displayMessage: 'Uma ou mais permissões informadas não existem.',
      details: [],
    });
    rolesService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));

    component.form.setValue({ code: 'VOLUNTEER', name: 'Voluntário', description: '' });
    component.submit();

    expect(component.errorMessage()).toBe('Uma ou mais permissões informadas não existem.');
  });

  it('shows the translated feedback for ROLES.ADMIN_REQUIRES_ROLES_WRITE on save', async () => {
    rolesService.getById.mockReturnValue(of(buildRole({ code: 'ADMIN', permissions: [] })));
    await setup(1);

    const apiError = TestBed.inject(ApiErrorService);
    vi.spyOn(apiError, 'resolve').mockReturnValue({
      statusCode: 422,
      code: 'ROLES.ADMIN_REQUIRES_ROLES_WRITE',
      displayMessage: 'O papel ADMIN não pode perder a permissão de gerenciar papéis.',
      details: [],
    });
    rolesService.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));

    component.form.controls.name.setValue('Administrador');
    component.submit();

    expect(component.errorMessage()).toBe(
      'O papel ADMIN não pode perder a permissão de gerenciar papéis.',
    );
  });
});
