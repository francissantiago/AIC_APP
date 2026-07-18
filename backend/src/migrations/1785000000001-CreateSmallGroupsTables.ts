import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmallGroupsTables1785000000001 implements MigrationInterface {
  name = 'CreateSmallGroupsTables1785000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`small_groups\` (
        \`id\` char(36) NOT NULL,
        \`congregation_id\` char(36) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` varchar(255) NULL,
        \`leader_member_id\` char(36) NULL,
        \`address\` varchar(255) NULL,
        \`day_of_week\` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0=Sunday .. 6=Saturday',
        \`start_time\` time NULL,
        \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_small_groups_congregation_name\` (\`congregation_id\`, \`name\`),
        KEY \`IDX_small_groups_congregation\` (\`congregation_id\`),
        KEY \`IDX_small_groups_leader\` (\`leader_member_id\`),
        CONSTRAINT \`FK_small_groups_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`)
          ON DELETE RESTRICT,
        CONSTRAINT \`FK_small_groups_leader_member\`
          FOREIGN KEY (\`leader_member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`small_group_members\` (
        \`small_group_id\` char(36) NOT NULL,
        \`member_id\` char(36) NOT NULL,
        \`role\` enum('leader','assistant','member') NOT NULL DEFAULT 'member',
        \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
        \`joined_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`small_group_id\`, \`member_id\`),
        KEY \`IDX_small_group_members_member\` (\`member_id\`),
        CONSTRAINT \`FK_small_group_members_group\`
          FOREIGN KEY (\`small_group_id\`) REFERENCES \`small_groups\` (\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`FK_small_group_members_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`small_group_meetings\` (
        \`id\` char(36) NOT NULL,
        \`small_group_id\` char(36) NOT NULL,
        \`meeting_date\` date NOT NULL,
        \`theme\` varchar(255) NULL,
        \`notes\` varchar(500) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_small_group_meetings_group_date\`
          (\`small_group_id\`, \`meeting_date\`),
        KEY \`IDX_small_group_meetings_date\` (\`meeting_date\`),
        CONSTRAINT \`FK_small_group_meetings_group\`
          FOREIGN KEY (\`small_group_id\`) REFERENCES \`small_groups\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`small_group_attendance\` (
        \`id\` char(36) NOT NULL,
        \`meeting_id\` char(36) NOT NULL,
        \`member_id\` char(36) NOT NULL,
        \`present\` tinyint(1) NOT NULL,
        \`notes\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_small_group_attendance_meeting_member\`
          (\`meeting_id\`, \`member_id\`),
        KEY \`IDX_small_group_attendance_member\` (\`member_id\`),
        CONSTRAINT \`FK_small_group_attendance_meeting\`
          FOREIGN KEY (\`meeting_id\`) REFERENCES \`small_group_meetings\` (\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`FK_small_group_attendance_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `small_group_attendance`');
    await queryRunner.query('DROP TABLE IF EXISTS `small_group_meetings`');
    await queryRunner.query('DROP TABLE IF EXISTS `small_group_members`');
    await queryRunner.query('DROP TABLE IF EXISTS `small_groups`');
  }
}
