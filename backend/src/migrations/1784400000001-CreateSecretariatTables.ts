import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecretariatTables1784400000001 implements MigrationInterface {
  name = 'CreateSecretariatTables1784400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`calendar_events\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`title\` VARCHAR(150) NOT NULL,
        \`type\` ENUM('service', 'meeting', 'rehearsal', 'wedding', 'other') NOT NULL,
        \`starts_at\` DATETIME(6) NOT NULL,
        \`ends_at\` DATETIME(6) NOT NULL,
        \`all_day\` TINYINT(1) NOT NULL DEFAULT 0,
        \`location\` VARCHAR(150) NULL,
        \`description\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_calendar_events_congregation_starts_at\` (\`congregation_id\`, \`starts_at\`),
        KEY \`IDX_calendar_events_congregation_type\` (\`congregation_id\`, \`type\`),
        CONSTRAINT \`FK_calendar_events_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_calendar_events_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`visitors\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`full_name\` VARCHAR(150) NOT NULL,
        \`phone\` VARCHAR(30) NULL,
        \`visit_date\` DATE NOT NULL,
        \`notes\` TEXT NULL,
        \`follow_up_done\` TINYINT(1) NOT NULL DEFAULT 0,
        \`member_id\` CHAR(36) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_visitors_congregation_visit_date\` (\`congregation_id\`, \`visit_date\`),
        KEY \`IDX_visitors_congregation_follow_up_done\` (\`congregation_id\`, \`follow_up_done\`),
        KEY \`IDX_visitors_member\` (\`member_id\`),
        CONSTRAINT \`FK_visitors_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_visitors_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`FK_visitors_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`attendance_records\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`event_date\` DATE NOT NULL,
        \`event_type\` ENUM('service', 'meeting', 'rehearsal', 'other') NOT NULL,
        \`calendar_event_id\` CHAR(36) NULL,
        \`total_present\` INT NOT NULL,
        \`adults\` INT NULL,
        \`children\` INT NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_attendance_records_congregation_event_date\` (\`congregation_id\`, \`event_date\`),
        KEY \`IDX_attendance_records_calendar_event\` (\`calendar_event_id\`),
        CONSTRAINT \`FK_attendance_records_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_attendance_records_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`FK_attendance_records_calendar_event\` FOREIGN KEY (\`calendar_event_id\`) REFERENCES \`calendar_events\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`secretariat_documents\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`type\` ENUM('minutes', 'letter', 'certificate', 'other') NOT NULL,
        \`document_date\` DATE NOT NULL,
        \`summary\` TEXT NULL,
        \`status\` ENUM('draft', 'final') NOT NULL DEFAULT 'draft',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_secretariat_documents_congregation_document_date\` (\`congregation_id\`, \`document_date\`),
        KEY \`IDX_secretariat_documents_congregation_type_status\` (\`congregation_id\`, \`type\`, \`status\`),
        CONSTRAINT \`FK_secretariat_documents_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_secretariat_documents_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `secretariat_documents`');
    await queryRunner.query('DROP TABLE `attendance_records`');
    await queryRunner.query('DROP TABLE `visitors`');
    await queryRunner.query('DROP TABLE `calendar_events`');
  }
}
