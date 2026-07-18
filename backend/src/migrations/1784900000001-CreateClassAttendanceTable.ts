import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassAttendanceTable1784900000001 implements MigrationInterface {
  name = 'CreateClassAttendanceTable1784900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`class_attendance\` (
        \`id\` char(36) NOT NULL,
        \`class_id\` char(36) NOT NULL,
        \`member_id\` char(36) NOT NULL,
        \`session_date\` date NOT NULL,
        \`present\` tinyint(1) NOT NULL,
        \`notes\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_class_attendance_session_member\`
          (\`class_id\`, \`member_id\`, \`session_date\`),
        KEY \`IDX_class_attendance_class_date\` (\`class_id\`, \`session_date\`),
        KEY \`IDX_class_attendance_member_date\` (\`member_id\`, \`session_date\`),
        CONSTRAINT \`FK_class_attendance_class\`
          FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`FK_class_attendance_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `class_attendance`');
  }
}
