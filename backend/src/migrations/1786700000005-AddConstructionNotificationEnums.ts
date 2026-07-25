import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConstructionNotificationEnums1786700000005 implements MigrationInterface {
  name = 'AddConstructionNotificationEnums1786700000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM(
        'visitor_follow_up',
        'schedule_reminder',
        'member_birthday',
        'construction_update',
        'construction_status_change',
        'construction_budget_alert'
      ) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`reference_type\` ENUM(
        'visitor',
        'schedule_assignment',
        'member',
        'construction_project',
        'construction_update'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications\`
      WHERE \`type\` IN (
        'construction_update',
        'construction_status_change',
        'construction_budget_alert'
      )
         OR \`reference_type\` IN ('construction_project', 'construction_update')
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM(
        'visitor_follow_up',
        'schedule_reminder',
        'member_birthday'
      ) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`reference_type\` ENUM(
        'visitor',
        'schedule_assignment',
        'member'
      ) NOT NULL
    `);
  }
}
