import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCongregationsTable1752750000006 implements MigrationInterface {
  name = 'CreateCongregationsTable1752750000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`congregations\` (
        \`id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`trade_name\` VARCHAR(150) NULL,
        \`type\` ENUM('headquarters', 'branch') NOT NULL DEFAULT 'headquarters',
        \`document\` VARCHAR(30) NULL,
        \`email\` VARCHAR(255) NULL,
        \`phone\` VARCHAR(30) NULL,
        \`address\` VARCHAR(255) NULL,
        \`city\` VARCHAR(100) NULL,
        \`state\` VARCHAR(50) NULL,
        \`zip_code\` VARCHAR(20) NULL,
        \`foundation_date\` DATE NULL,
        \`website\` VARCHAR(255) NULL,
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_congregations_email\` (\`email\`),
        UNIQUE KEY \`UQ_congregations_document\` (\`document\`),
        KEY \`IDX_congregations_name\` (\`name\`),
        KEY \`IDX_congregations_status\` (\`status\`),
        KEY \`IDX_congregations_type\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `congregations`');
  }
}
