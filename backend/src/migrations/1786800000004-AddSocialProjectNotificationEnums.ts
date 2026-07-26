import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialProjectNotificationEnums1786800000004 implements MigrationInterface {
  name = 'AddSocialProjectNotificationEnums1786800000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM(
        'visitor_follow_up',
        'schedule_reminder',
        'member_birthday',
        'construction_update',
        'construction_status_change',
        'construction_budget_alert',
        'social_project_session_created',
        'social_project_status_change',
        'social_project_budget_alert',
        'social_project_participant_added'
      ) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`reference_type\` ENUM(
        'visitor',
        'schedule_assignment',
        'member',
        'construction_project',
        'construction_update',
        'social_project',
        'social_project_session'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications\`
      WHERE \`type\` IN (
        'social_project_session_created',
        'social_project_status_change',
        'social_project_budget_alert',
        'social_project_participant_added'
      )
         OR \`reference_type\` IN ('social_project', 'social_project_session')
    `);
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
}
