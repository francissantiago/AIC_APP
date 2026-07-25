import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConstructionsTables1786700000001 implements MigrationInterface {
  name = 'CreateConstructionsTables1786700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`construction_projects\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`ministry_id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`location\` VARCHAR(255) NULL,
        \`status\` ENUM('planning', 'in_progress', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'planning',
        \`progress_percent\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`budget_amount\` DECIMAL(15,2) NULL,
        \`spent_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0,
        \`start_date\` DATE NULL,
        \`expected_end_date\` DATE NULL,
        \`actual_end_date\` DATE NULL,
        \`supervisor_member_id\` CHAR(36) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_construction_projects_congregation_name\` (\`congregation_id\`, \`name\`),
        KEY \`IDX_construction_projects_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_construction_projects_ministry\` (\`ministry_id\`),
        KEY \`IDX_construction_projects_supervisor\` (\`supervisor_member_id\`),
        CONSTRAINT \`FK_construction_projects_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_construction_projects_ministry\` FOREIGN KEY (\`ministry_id\`) REFERENCES \`ministries\` (\`id\`),
        CONSTRAINT \`FK_construction_projects_supervisor\` FOREIGN KEY (\`supervisor_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`construction_updates\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`construction_project_id\` CHAR(36) NOT NULL,
        \`title\` VARCHAR(120) NOT NULL,
        \`description\` TEXT NULL,
        \`progress_percent\` TINYINT UNSIGNED NULL,
        \`recorded_at\` DATE NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_construction_updates_project\` (\`construction_project_id\`),
        KEY \`IDX_construction_updates_congregation\` (\`congregation_id\`),
        CONSTRAINT \`FK_construction_updates_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_construction_updates_project\` FOREIGN KEY (\`construction_project_id\`) REFERENCES \`construction_projects\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`construction_photos\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`construction_project_id\` CHAR(36) NOT NULL,
        \`construction_update_id\` CHAR(36) NULL,
        \`uploaded_by_user_id\` CHAR(36) NOT NULL,
        \`file_path\` VARCHAR(500) NOT NULL,
        \`original_filename\` VARCHAR(255) NOT NULL,
        \`mime_type\` VARCHAR(120) NOT NULL,
        \`size_bytes\` INT UNSIGNED NOT NULL,
        \`caption\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_construction_photos_project\` (\`construction_project_id\`),
        KEY \`IDX_construction_photos_update\` (\`construction_update_id\`),
        CONSTRAINT \`FK_construction_photos_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_construction_photos_project\` FOREIGN KEY (\`construction_project_id\`) REFERENCES \`construction_projects\` (\`id\`),
        CONSTRAINT \`FK_construction_photos_update\` FOREIGN KEY (\`construction_update_id\`) REFERENCES \`construction_updates\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_construction_photos_user\` FOREIGN KEY (\`uploaded_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `construction_photos`');
    await queryRunner.query('DROP TABLE `construction_updates`');
    await queryRunner.query('DROP TABLE `construction_projects`');
  }
}
