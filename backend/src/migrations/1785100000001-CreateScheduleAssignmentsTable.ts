import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleAssignmentsTable1785100000001 implements MigrationInterface {
  name = 'CreateScheduleAssignmentsTable1785100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`schedule_assignments\` (
        \`id\` char(36) NOT NULL,
        \`calendar_event_id\` char(36) NOT NULL,
        \`ministry_id\` char(36) NOT NULL,
        \`member_id\` char(36) NOT NULL,
        \`role_label\` varchar(80) NOT NULL,
        \`confirmed\` tinyint(1) NOT NULL DEFAULT 0,
        \`notes\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_schedule_assignments_event_ministry_member\`
          (\`calendar_event_id\`, \`ministry_id\`, \`member_id\`),
        KEY \`IDX_schedule_assignments_event\` (\`calendar_event_id\`),
        KEY \`IDX_schedule_assignments_ministry\` (\`ministry_id\`),
        KEY \`IDX_schedule_assignments_member\` (\`member_id\`),
        KEY \`IDX_schedule_assignments_confirmed\` (\`confirmed\`),
        CONSTRAINT \`FK_schedule_assignments_event\`
          FOREIGN KEY (\`calendar_event_id\`) REFERENCES \`calendar_events\` (\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`FK_schedule_assignments_ministry\`
          FOREIGN KEY (\`ministry_id\`) REFERENCES \`ministries\` (\`id\`)
          ON DELETE RESTRICT,
        CONSTRAINT \`FK_schedule_assignments_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `schedule_assignments`');
  }
}
