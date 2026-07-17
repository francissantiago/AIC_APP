import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRolesTable1752750000003 implements MigrationInterface {
  name = 'CreateUserRolesTable1752750000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_roles\` (
        \`user_id\` CHAR(36) NOT NULL,
        \`role_id\` INT UNSIGNED NOT NULL,
        \`assigned_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`user_id\`, \`role_id\`),
        KEY \`IDX_user_roles_role_id\` (\`role_id\`),
        CONSTRAINT \`FK_user_roles_user\` FOREIGN KEY (\`user_id\`)
          REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_roles_role\` FOREIGN KEY (\`role_id\`)
          REFERENCES \`roles\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `user_roles`');
  }
}
