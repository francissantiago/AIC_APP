import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationPreferencesTable1787100000001 implements MigrationInterface {
  name = 'CreateNotificationPreferencesTable1787100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notification_preferences\` (
        \`id\` CHAR(36) NOT NULL,
        \`user_id\` CHAR(36) NOT NULL,
        \`type\` ENUM(
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
        ) NOT NULL,
        \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_notification_preferences_user_type\` (\`user_id\`, \`type\`),
        KEY \`IDX_notification_preferences_user\` (\`user_id\`),
        CONSTRAINT \`FK_notification_preferences_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `notification_preferences`');
  }
}
