import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1752750000001 implements MigrationInterface {
  name = 'CreateUsersTable1752750000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` CHAR(36) NOT NULL,
        \`username\` VARCHAR(50) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`full_name\` VARCHAR(150) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`status\` ENUM('active', 'inactive', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
        \`two_factor_enabled\` TINYINT(1) NOT NULL DEFAULT 0,
        \`two_factor_secret\` VARCHAR(255) NULL,
        \`last_login_at\` DATETIME NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_users_username\` (\`username\`),
        UNIQUE KEY \`UQ_users_email\` (\`email\`),
        KEY \`IDX_users_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `users`');
  }
}
