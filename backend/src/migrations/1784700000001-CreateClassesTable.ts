import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassesTable1784700000001 implements MigrationInterface {
  name = 'CreateClassesTable1784700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`classes\` (
        \`id\` char(36) NOT NULL,
        \`congregation_id\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` varchar(255) NULL,
        \`age_group\` enum(
          'nursery',
          'children',
          'juniors',
          'teens',
          'youth',
          'adults',
          'mixed'
        ) NOT NULL DEFAULT 'mixed',
        \`teacher_member_id\` char(36) NULL,
        \`day_of_week\` tinyint unsigned NOT NULL DEFAULT 0
          COMMENT '0=Sunday .. 6=Saturday (Date.getDay)',
        \`start_time\` time NULL,
        \`room\` varchar(80) NULL,
        \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_classes_congregation_name\` (\`congregation_id\`, \`name\`),
        KEY \`IDX_classes_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_classes_teacher_member\` (\`teacher_member_id\`),
        CONSTRAINT \`FK_classes_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_classes_teacher_member\`
          FOREIGN KEY (\`teacher_member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `classes`');
  }
}
