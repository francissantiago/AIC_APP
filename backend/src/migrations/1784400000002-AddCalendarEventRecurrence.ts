import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarEventRecurrence1784400000002 implements MigrationInterface {
  name = 'AddCalendarEventRecurrence1784400000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        ADD COLUMN \`recurrence_frequency\` ENUM('none', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'none' AFTER \`description\`,
        ADD COLUMN \`recurrence_interval\` INT NOT NULL DEFAULT 1 AFTER \`recurrence_frequency\`,
        ADD COLUMN \`recurrence_until\` DATE NULL AFTER \`recurrence_interval\`
    `);
    await queryRunner.query(`
      CREATE INDEX \`IDX_calendar_events_congregation_recurrence\`
        ON \`calendar_events\` (\`congregation_id\`, \`recurrence_frequency\`, \`starts_at\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_calendar_events_congregation_recurrence` ON `calendar_events`',
    );
    await queryRunner.query(`
      ALTER TABLE \`calendar_events\`
        DROP COLUMN \`recurrence_until\`,
        DROP COLUMN \`recurrence_interval\`,
        DROP COLUMN \`recurrence_frequency\`
    `);
  }
}
