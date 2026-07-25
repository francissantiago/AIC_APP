import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissionsTables1786600000001 implements MigrationInterface {
  name = 'CreateMissionsTables1786600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`mission_fields\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`country\` VARCHAR(100) NOT NULL,
        \`city\` VARCHAR(100) NULL,
        \`region\` VARCHAR(100) NULL,
        \`description\` VARCHAR(255) NULL,
        \`coordinator_member_id\` CHAR(36) NULL,
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_mission_fields_congregation_name\` (\`congregation_id\`, \`name\`),
        KEY \`IDX_mission_fields_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_mission_fields_coordinator\` (\`coordinator_member_id\`),
        CONSTRAINT \`FK_mission_fields_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_mission_fields_coordinator\` FOREIGN KEY (\`coordinator_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`mission_assignments\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`mission_field_id\` CHAR(36) NOT NULL,
        \`role\` ENUM('missionary', 'support', 'short_term') NOT NULL DEFAULT 'missionary',
        \`status\` ENUM('active', 'on_leave', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
        \`start_date\` DATE NOT NULL,
        \`expected_end_date\` DATE NULL,
        \`actual_end_date\` DATE NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_mission_assignments_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_mission_assignments_member\` (\`member_id\`),
        KEY \`IDX_mission_assignments_field\` (\`mission_field_id\`),
        CONSTRAINT \`FK_mission_assignments_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_mission_assignments_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`),
        CONSTRAINT \`FK_mission_assignments_field\` FOREIGN KEY (\`mission_field_id\`) REFERENCES \`mission_fields\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `mission_assignments`');
    await queryRunner.query('DROP TABLE `mission_fields`');
  }
}
