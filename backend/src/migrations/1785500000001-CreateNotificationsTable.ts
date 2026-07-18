import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1785500000001 implements MigrationInterface {
  name = 'CreateNotificationsTable1785500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`id\` CHAR(36) NOT NULL,
        \`user_id\` CHAR(36) NOT NULL,
        \`type\` ENUM('visitor_follow_up', 'schedule_reminder') NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`body\` TEXT NOT NULL,
        \`payload\` JSON NULL,
        \`reference_type\` ENUM('visitor', 'schedule_assignment') NOT NULL,
        \`reference_id\` CHAR(36) NOT NULL,
        \`read_at\` DATETIME(6) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_notifications_user_type_ref\` (\`user_id\`, \`type\`, \`reference_id\`),
        KEY \`IDX_notifications_user_created\` (\`user_id\`, \`created_at\`),
        KEY \`IDX_notifications_user_unread\` (\`user_id\`, \`read_at\`),
        CONSTRAINT \`FK_notifications_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `notifications`');
  }
}
