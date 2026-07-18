import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMinistriesTables1784500000004 implements MigrationInterface {
  name = 'CreateMinistriesTables1784500000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`ministries\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`leader_member_id\` CHAR(36) NULL,
        \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_ministries_congregation_name\` (\`congregation_id\`, \`name\`),
        KEY \`IDX_ministries_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_ministries_leader_member\` (\`leader_member_id\`),
        CONSTRAINT \`FK_ministries_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_ministries_leader_member\` FOREIGN KEY (\`leader_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`ministry_members\` (
        \`ministry_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`role\` ENUM('leader', 'assistant', 'member') NOT NULL DEFAULT 'member',
        \`joined_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`ministry_id\`, \`member_id\`),
        KEY \`IDX_ministry_members_member\` (\`member_id\`),
        KEY \`IDX_ministry_members_ministry_role\` (\`ministry_id\`, \`role\`),
        CONSTRAINT \`FK_ministry_members_ministry\` FOREIGN KEY (\`ministry_id\`) REFERENCES \`ministries\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_ministry_members_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `ministry_members`');
    await queryRunner.query('DROP TABLE `ministries`');
  }
}
