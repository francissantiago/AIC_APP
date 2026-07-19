import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBirthdayCalendarEventSupport1786000000001 implements MigrationInterface {
  name = 'AddBirthdayCalendarEventSupport1786000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        MODIFY COLUMN \`type\` ENUM(
          'service', 'meeting', 'rehearsal', 'wedding', 'other', 'birthday'
        ) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        MODIFY COLUMN \`recurrence_frequency\` ENUM(
          'none', 'daily', 'weekly', 'monthly', 'yearly'
        ) NOT NULL DEFAULT 'none'
    `);
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        ADD COLUMN \`source_member_id\` CHAR(36) NULL AFTER \`created_by_user_id\`,
        ADD INDEX \`IDX_calendar_events_source_member\` (\`source_member_id\`),
        ADD UNIQUE KEY \`UQ_calendar_events_congregation_source_member\` (
          \`congregation_id\`, \`source_member_id\`
        ),
        ADD CONSTRAINT \`FK_calendar_events_source_member\`
          FOREIGN KEY (\`source_member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        DROP FOREIGN KEY \`FK_calendar_events_source_member\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        DROP INDEX \`UQ_calendar_events_congregation_source_member\`,
        DROP INDEX \`IDX_calendar_events_source_member\`,
        DROP COLUMN \`source_member_id\`
    `);
    await queryRunner.query(`
      UPDATE \`calendar_events\`
      SET \`type\` = 'other'
      WHERE \`type\` = 'birthday'
    `);
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        MODIFY COLUMN \`type\` ENUM(
          'service', 'meeting', 'rehearsal', 'wedding', 'other'
        ) NOT NULL
    `);
    await queryRunner.query(`
      UPDATE \`calendar_events\`
      SET \`recurrence_frequency\` = 'none'
      WHERE \`recurrence_frequency\` = 'yearly'
    `);
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        MODIFY COLUMN \`recurrence_frequency\` ENUM(
          'none', 'daily', 'weekly', 'monthly'
        ) NOT NULL DEFAULT 'none'
    `);
  }
}
