import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissionBookletsTables1786900000001 implements MigrationInterface {
  name = 'CreateMissionBookletsTables1786900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`mission_booklets\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`destination_type\` ENUM('general', 'field', 'assignment') NOT NULL,
        \`mission_field_id\` CHAR(36) NULL,
        \`mission_assignment_id\` CHAR(36) NULL,
        \`title\` VARCHAR(120) NULL,
        \`installment_count\` SMALLINT UNSIGNED NOT NULL,
        \`installment_amount\` DECIMAL(13,2) NOT NULL,
        \`total_amount\` DECIMAL(13,2) NOT NULL,
        \`first_due_date\` DATE NOT NULL,
        \`status\` ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
        \`notes\` TEXT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_mission_booklets_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_mission_booklets_member\` (\`member_id\`),
        KEY \`IDX_mission_booklets_field\` (\`mission_field_id\`),
        KEY \`IDX_mission_booklets_assignment\` (\`mission_assignment_id\`),
        CONSTRAINT \`FK_mission_booklets_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_mission_booklets_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`),
        CONSTRAINT \`FK_mission_booklets_field\` FOREIGN KEY (\`mission_field_id\`) REFERENCES \`mission_fields\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_mission_booklets_assignment\` FOREIGN KEY (\`mission_assignment_id\`) REFERENCES \`mission_assignments\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_mission_booklets_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`mission_booklet_installments\` (
        \`id\` CHAR(36) NOT NULL,
        \`booklet_id\` CHAR(36) NOT NULL,
        \`installment_number\` SMALLINT UNSIGNED NOT NULL,
        \`due_date\` DATE NOT NULL,
        \`amount\` DECIMAL(13,2) NOT NULL,
        \`status\` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
        \`paid_at\` DATETIME(6) NULL,
        \`financial_entry_id\` CHAR(36) NULL,
        \`notes\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_mission_booklet_installments_booklet_number\` (\`booklet_id\`, \`installment_number\`),
        KEY \`IDX_mission_booklet_installments_status_due\` (\`booklet_id\`, \`status\`, \`due_date\`),
        CONSTRAINT \`FK_mission_booklet_installments_booklet\` FOREIGN KEY (\`booklet_id\`) REFERENCES \`mission_booklets\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `mission_booklet_installments`');
    await queryRunner.query('DROP TABLE `mission_booklets`');
  }
}
