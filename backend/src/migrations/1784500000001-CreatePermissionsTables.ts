import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePermissionsTables1784500000001 implements MigrationInterface {
  name = 'CreatePermissionsTables1784500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`permissions\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(60) NOT NULL COMMENT 'formato recurso:ação, ex.: finance:write',
        \`resource\` VARCHAR(30) NOT NULL,
        \`action\` VARCHAR(20) NOT NULL COMMENT "'read' | 'write'",
        \`description\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_permissions_code\` (\`code\`),
        KEY \`IDX_permissions_resource\` (\`resource\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`role_permissions\` (
        \`role_id\` INT UNSIGNED NOT NULL,
        \`permission_id\` INT UNSIGNED NOT NULL,
        \`granted_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`role_id\`, \`permission_id\`),
        KEY \`IDX_role_permissions_permission_id\` (\`permission_id\`),
        CONSTRAINT \`FK_role_permissions_role\` FOREIGN KEY (\`role_id\`)
          REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_role_permissions_permission\` FOREIGN KEY (\`permission_id\`)
          REFERENCES \`permissions\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `role_permissions`');
    await queryRunner.query('DROP TABLE `permissions`');
  }
}
