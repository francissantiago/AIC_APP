import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementsTable1785400000001 implements MigrationInterface {
  name = 'CreateAnnouncementsTable1785400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`announcements\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`title\` VARCHAR(160) NOT NULL,
        \`body\` TEXT NOT NULL,
        \`audience\` ENUM('all', 'roles', 'ministries') NOT NULL DEFAULT 'all',
        \`audience_targets\` JSON NULL,
        \`published_at\` DATETIME(6) NOT NULL,
        \`expires_at\` DATETIME(6) NULL,
        \`author_user_id\` CHAR(36) NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_announcements_congregation\` (\`congregation_id\`),
        KEY \`IDX_announcements_author\` (\`author_user_id\`),
        KEY \`IDX_announcements_board\` (\`congregation_id\`, \`published_at\`, \`expires_at\`, \`deleted_at\`),
        CONSTRAINT \`FK_announcements_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_announcements_author\`
          FOREIGN KEY (\`author_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `announcements`');
  }
}
