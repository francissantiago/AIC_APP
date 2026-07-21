import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleCalendarSyncTables1786100000001 implements MigrationInterface {
  name = 'CreateGoogleCalendarSyncTables1786100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`google_calendar_connections\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`connected_by_user_id\` CHAR(36) NOT NULL,
        \`google_account_email\` VARCHAR(255) NOT NULL,
        \`google_calendar_id\` VARCHAR(255) NOT NULL DEFAULT 'primary',
        \`access_token_encrypted\` TEXT NOT NULL,
        \`refresh_token_encrypted\` TEXT NOT NULL,
        \`token_expires_at\` DATETIME(6) NOT NULL,
        \`scopes\` VARCHAR(500) NOT NULL,
        \`sync_token\` VARCHAR(1024) NULL,
        \`sync_direction\` ENUM('bidirectional', 'aic_to_google', 'google_to_aic') NOT NULL DEFAULT 'bidirectional',
        \`conflict_policy\` ENUM('aic_wins', 'google_wins', 'latest_wins') NOT NULL DEFAULT 'latest_wins',
        \`status\` ENUM('active', 'disconnected', 'error', 'revoked') NOT NULL DEFAULT 'active',
        \`last_sync_at\` DATETIME(6) NULL,
        \`last_sync_error\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_google_calendar_connections_congregation\` (\`congregation_id\`),
        KEY \`IDX_google_calendar_connections_status\` (\`status\`, \`deleted_at\`),
        CONSTRAINT \`FK_google_calendar_connections_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_google_calendar_connections_connected_by\` FOREIGN KEY (\`connected_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`google_calendar_event_links\` (
        \`id\` CHAR(36) NOT NULL,
        \`connection_id\` CHAR(36) NOT NULL,
        \`calendar_event_id\` CHAR(36) NOT NULL,
        \`google_event_id\` VARCHAR(255) NOT NULL,
        \`google_etag\` VARCHAR(255) NULL,
        \`last_pushed_at\` DATETIME(6) NULL,
        \`last_pulled_at\` DATETIME(6) NULL,
        \`content_hash\` CHAR(64) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_gcal_link_connection_event\` (\`connection_id\`, \`calendar_event_id\`),
        UNIQUE KEY \`UQ_gcal_link_connection_google\` (\`connection_id\`, \`google_event_id\`),
        KEY \`IDX_gcal_link_calendar_event\` (\`calendar_event_id\`),
        CONSTRAINT \`FK_gcal_link_connection\` FOREIGN KEY (\`connection_id\`) REFERENCES \`google_calendar_connections\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_gcal_link_calendar_event\` FOREIGN KEY (\`calendar_event_id\`) REFERENCES \`calendar_events\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `google_calendar_event_links`');
    await queryRunner.query('DROP TABLE `google_calendar_connections`');
  }
}
