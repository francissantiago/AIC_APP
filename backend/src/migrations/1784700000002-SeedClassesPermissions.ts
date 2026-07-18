import { MigrationInterface, QueryRunner } from 'typeorm';

interface PermissionSeed {
  code: string;
  resource: string;
  action: 'read' | 'write';
  description: string;
}

const PERMISSIONS: ReadonlyArray<PermissionSeed> = [
  {
    code: 'classes:read',
    resource: 'classes',
    action: 'read',
    description: 'Visualizar turmas da EBD',
  },
  {
    code: 'classes:write',
    resource: 'classes',
    action: 'write',
    description: 'Criar, editar e excluir turmas da EBD',
  },
];

const ROLE_PERMISSION_CODES: ReadonlyArray<{
  roleCode: string;
  permissionCodes: readonly string[];
}> = [
  {
    roleCode: 'ADMIN',
    permissionCodes: ['classes:read', 'classes:write'],
  },
  {
    roleCode: 'PASTOR',
    permissionCodes: ['classes:read'],
  },
  {
    roleCode: 'SECRETARY',
    permissionCodes: ['classes:read', 'classes:write'],
  },
  {
    roleCode: 'LEADER',
    permissionCodes: ['classes:read'],
  },
];

export class SeedClassesPermissions1784700000002 implements MigrationInterface {
  name = 'SeedClassesPermissions1784700000002';

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
