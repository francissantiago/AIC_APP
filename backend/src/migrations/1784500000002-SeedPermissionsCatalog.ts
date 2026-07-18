import { MigrationInterface, QueryRunner } from 'typeorm';

interface PermissionSeed {
  code: string;
  resource: string;
  action: 'read' | 'write';
  description: string;
}

const PERMISSIONS: ReadonlyArray<PermissionSeed> = [
  {
    code: 'users:read',
    resource: 'users',
    action: 'read',
    description: 'Visualizar usuários do sistema',
  },
  {
    code: 'users:write',
    resource: 'users',
    action: 'write',
    description: 'Criar, editar, excluir usuários e atribuir papéis',
  },
  {
    code: 'roles:read',
    resource: 'roles',
    action: 'read',
    description: 'Visualizar papéis e suas permissões',
  },
  {
    code: 'roles:write',
    resource: 'roles',
    action: 'write',
    description: 'Criar, editar, excluir papéis e gerenciar suas permissões',
  },
  {
    code: 'members:read',
    resource: 'members',
    action: 'read',
    description: 'Visualizar membros da congregação',
  },
  {
    code: 'members:write',
    resource: 'members',
    action: 'write',
    description: 'Criar, editar, excluir membros',
  },
  {
    code: 'congregations:read',
    resource: 'congregations',
    action: 'read',
    description: 'Visualizar dados da congregação-base',
  },
  {
    code: 'congregations:write',
    resource: 'congregations',
    action: 'write',
    description: 'Editar dados da congregação-base',
  },
  {
    code: 'finance:read',
    resource: 'finance',
    action: 'read',
    description: 'Visualizar dashboard, lançamentos e categorias financeiras',
  },
  {
    code: 'finance:write',
    resource: 'finance',
    action: 'write',
    description: 'Criar, editar, excluir categorias e lançamentos financeiros',
  },
  {
    code: 'assets:read',
    resource: 'assets',
    action: 'read',
    description: 'Visualizar bens patrimoniais',
  },
  {
    code: 'assets:write',
    resource: 'assets',
    action: 'write',
    description: 'Criar, editar, excluir bens patrimoniais',
  },
  {
    code: 'secretariat:read',
    resource: 'secretariat',
    action: 'read',
    description:
      'Visualizar agenda, visitantes, presença e documentos de secretaria',
  },
  {
    code: 'secretariat:write',
    resource: 'secretariat',
    action: 'write',
    description:
      'Criar, editar, excluir eventos, visitantes, presença e documentos de secretaria',
  },
];

/** Replica exatamente o acesso efetivo que cada papel já tem hoje (spec §6.4). */
const ROLE_PERMISSION_CODES: ReadonlyArray<{
  roleCode: string;
  permissionCodes: readonly string[];
}> = [
  {
    roleCode: 'ADMIN',
    permissionCodes: [
      'users:read',
      'users:write',
      'roles:read',
      'roles:write',
      'members:read',
      'members:write',
      'congregations:read',
      'congregations:write',
      'finance:read',
      'finance:write',
      'assets:read',
      'assets:write',
      'secretariat:read',
      'secretariat:write',
    ],
  },
  {
    roleCode: 'PASTOR',
    permissionCodes: [
      'users:read',
      'users:write',
      'roles:read',
      'members:read',
      'members:write',
      'congregations:read',
      'congregations:write',
      'finance:read',
      'assets:read',
      'secretariat:read',
    ],
  },
  {
    roleCode: 'TREASURER',
    permissionCodes: [
      'users:read',
      'users:write',
      'roles:read',
      'members:read',
      'members:write',
      'congregations:read',
      'congregations:write',
      'finance:read',
      'finance:write',
      'assets:read',
      'assets:write',
    ],
  },
  {
    roleCode: 'SECRETARY',
    permissionCodes: [
      'users:read',
      'users:write',
      'roles:read',
      'members:read',
      'members:write',
      'congregations:read',
      'congregations:write',
      'secretariat:read',
      'secretariat:write',
    ],
  },
  {
    roleCode: 'LEADER',
    permissionCodes: [
      'users:read',
      'users:write',
      'roles:read',
      'members:read',
      'members:write',
      'congregations:read',
      'congregations:write',
    ],
  },
  {
    roleCode: 'MEMBER',
    permissionCodes: [
      'users:read',
      'users:write',
      'roles:read',
      'members:read',
      'members:write',
      'congregations:read',
      'congregations:write',
    ],
  },
];

export class SeedPermissionsCatalog1784500000002 implements MigrationInterface {
  name = 'SeedPermissionsCatalog1784500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of PERMISSIONS) {
      await queryRunner.query(
        `INSERT INTO \`permissions\` (\`code\`, \`resource\`, \`action\`, \`description\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`resource\` = VALUES(\`resource\`),
           \`action\` = VALUES(\`action\`),
           \`description\` = VALUES(\`description\`)`,
        [
          permission.code,
          permission.resource,
          permission.action,
          permission.description,
        ],
      );
    }

    for (const { roleCode, permissionCodes } of ROLE_PERMISSION_CODES) {
      for (const permissionCode of permissionCodes) {
        await queryRunner.query(
          `INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
           SELECT r.\`id\`, p.\`id\`
           FROM \`roles\` r, \`permissions\` p
           WHERE r.\`code\` = ? AND p.\`code\` = ?`,
          [roleCode, permissionCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`permissions\` WHERE \`code\` IN (${PERMISSIONS.map(() => '?').join(', ')})`,
      PERMISSIONS.map((permission) => permission.code),
    );
  }
}
