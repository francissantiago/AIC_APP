import { MigrationInterface, QueryRunner } from 'typeorm';

const PERMISSION = {
  code: 'congregations:manage_members',
  resource: 'congregations',
  action: 'write' as const,
  description:
    'Gerenciar quais congregações cada usuário pode acessar (membership de tenant)',
};

const ROLE_CODES = ['ADMIN', 'PASTOR'] as const;

export class SeedCongregationManageMembersPermission1785800000003 implements MigrationInterface {
  name = 'SeedCongregationManageMembersPermission1785800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`permissions\` (\`code\`, \`resource\`, \`action\`, \`description\`)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`resource\` = VALUES(\`resource\`),
         \`action\` = VALUES(\`action\`),
         \`description\` = VALUES(\`description\`)`,
      [
        PERMISSION.code,
        PERMISSION.resource,
        PERMISSION.action,
        PERMISSION.description,
      ],
    );

    for (const roleCode of ROLE_CODES) {
      await queryRunner.query(
        `INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
         SELECT r.\`id\`, p.\`id\`
         FROM \`roles\` r, \`permissions\` p
         WHERE r.\`code\` = ? AND p.\`code\` = ?`,
        [roleCode, PERMISSION.code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE rp FROM \`role_permissions\` rp
       INNER JOIN \`permissions\` p ON p.\`id\` = rp.\`permission_id\`
       WHERE p.\`code\` = ?`,
      [PERMISSION.code],
    );
    await queryRunner.query(`DELETE FROM \`permissions\` WHERE \`code\` = ?`, [
      PERMISSION.code,
    ]);
  }
}
