import { MigrationInterface, QueryRunner } from 'typeorm';

interface PermissionSeed {
  code: string;
  resource: string;
  action: 'read' | 'write';
  description: string;
}

const PERMISSIONS: ReadonlyArray<PermissionSeed> = [
  {
    code: 'small-groups:read',
    resource: 'small-groups',
    action: 'read',
    description: 'Visualizar pequenos grupos',
  },
  {
    code: 'small-groups:write',
    resource: 'small-groups',
    action: 'write',
    description: 'Criar, editar e excluir pequenos grupos',
  },
];

const ROLE_PERMISSION_CODES: ReadonlyArray<{
  roleCode: string;
  permissionCodes: readonly string[];
}> = [
  {
    roleCode: 'ADMIN',
    permissionCodes: ['small-groups:read', 'small-groups:write'],
  },
  {
    roleCode: 'PASTOR',
    permissionCodes: ['small-groups:read'],
  },
  {
    roleCode: 'SECRETARY',
    permissionCodes: ['small-groups:read', 'small-groups:write'],
  },
  {
    roleCode: 'LEADER',
    permissionCodes: ['small-groups:read'],
  },
];

export class SeedSmallGroupsPermissions1785000000002 implements MigrationInterface {
  name = 'SeedSmallGroupsPermissions1785000000002';

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
    const codes = PERMISSIONS.map((permission) => permission.code);
    await queryRunner.query(
      `DELETE rp FROM \`role_permissions\` rp
       INNER JOIN \`permissions\` p ON p.\`id\` = rp.\`permission_id\`
       WHERE p.\`code\` IN (${codes.map(() => '?').join(', ')})`,
      codes,
    );
    await queryRunner.query(
      `DELETE FROM \`permissions\` WHERE \`code\` IN (${codes.map(() => '?').join(', ')})`,
      codes,
    );
  }
}
