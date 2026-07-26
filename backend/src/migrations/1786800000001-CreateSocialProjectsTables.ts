import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialProjectsTables1786800000001 implements MigrationInterface {
  name = 'CreateSocialProjectsTables1786800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`social_projects\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`category\` ENUM('music', 'sports', 'computing', 'other') NOT NULL DEFAULT 'other',
        \`leader_member_id\` CHAR(36) NULL,
        \`day_of_week\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`start_time\` TIME NULL,
        \`location\` VARCHAR(255) NULL,
        \`budget_amount\` DECIMAL(15,2) NULL,
        \`spent_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_social_projects_congregation_name\` (\`congregation_id\`, \`name\`),
        KEY \`IDX_social_projects_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_social_projects_congregation_category\` (\`congregation_id\`, \`category\`),
        KEY \`IDX_social_projects_leader_member\` (\`leader_member_id\`),
        CONSTRAINT \`FK_social_projects_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_social_projects_leader_member\` FOREIGN KEY (\`leader_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`social_project_members\` (
        \`social_project_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`role\` ENUM('leader', 'assistant', 'participant') NOT NULL DEFAULT 'participant',
        \`joined_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`social_project_id\`, \`member_id\`),
        KEY \`IDX_social_project_members_member\` (\`member_id\`),
        KEY \`IDX_social_project_members_project_role\` (\`social_project_id\`, \`role\`),
        CONSTRAINT \`FK_social_project_members_project\` FOREIGN KEY (\`social_project_id\`) REFERENCES \`social_projects\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_social_project_members_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`social_project_sessions\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`social_project_id\` CHAR(36) NOT NULL,
        \`session_date\` DATE NOT NULL,
        \`title\` VARCHAR(120) NOT NULL,
        \`theme\` VARCHAR(255) NULL,
        \`notes\` VARCHAR(500) NULL,
        \`location\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_social_project_sessions_project_date\` (\`social_project_id\`, \`session_date\`),
        KEY \`IDX_social_project_sessions_date\` (\`session_date\`),
        KEY \`IDX_social_project_sessions_congregation\` (\`congregation_id\`),
        CONSTRAINT \`FK_social_project_sessions_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_social_project_sessions_project\` FOREIGN KEY (\`social_project_id\`) REFERENCES \`social_projects\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`social_project_attendance\` (
        \`id\` CHAR(36) NOT NULL,
        \`session_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`present\` BOOLEAN NOT NULL,
        \`notes\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_social_project_attendance_session_member\` (\`session_id\`, \`member_id\`),
        KEY \`IDX_social_project_attendance_member\` (\`member_id\`),
        CONSTRAINT \`FK_social_project_attendance_session\` FOREIGN KEY (\`session_id\`) REFERENCES \`social_project_sessions\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_social_project_attendance_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `social_project_attendance`');
    await queryRunner.query('DROP TABLE `social_project_sessions`');
    await queryRunner.query('DROP TABLE `social_project_members`');
    await queryRunner.query('DROP TABLE `social_projects`');
  }
}
