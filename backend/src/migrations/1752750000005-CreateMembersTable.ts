import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembersTable1752750000005 implements MigrationInterface {
  name = 'CreateMembersTable1752750000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`members\` (
        \`id\` CHAR(36) NOT NULL,
        \`full_name\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(255) NULL,
        \`phone\` VARCHAR(30) NULL,
        \`document\` VARCHAR(30) NULL,
        \`birth_date\` DATE NULL,
        \`gender\` ENUM('male', 'female', 'other', 'unspecified') NOT NULL DEFAULT 'unspecified',
        \`marital_status\` ENUM('single', 'married', 'divorced', 'widowed', 'other') NOT NULL DEFAULT 'other',
        \`status\` ENUM('active', 'inactive', 'transferred', 'deceased') NOT NULL DEFAULT 'active',
        \`baptism_date\` DATE NULL,
        \`membership_date\` DATE NULL,
        \`address\` VARCHAR(255) NULL,
        \`city\` VARCHAR(100) NULL,
        \`state\` VARCHAR(50) NULL,
        \`zip_code\` VARCHAR(20) NULL,
        \`notes\` TEXT NULL,
        \`user_id\` CHAR(36) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_members_email\` (\`email\`),
        UNIQUE KEY \`UQ_members_document\` (\`document\`),
        UNIQUE KEY \`UQ_members_user_id\` (\`user_id\`),
        KEY \`IDX_members_status\` (\`status\`),
        KEY \`IDX_members_full_name\` (\`full_name\`),
        CONSTRAINT \`FK_members_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `members`');
  }
}
