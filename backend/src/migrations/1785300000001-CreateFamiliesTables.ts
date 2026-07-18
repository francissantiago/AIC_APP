import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFamiliesTables1785300000001 implements MigrationInterface {
  name = 'CreateFamiliesTables1785300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`families\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`head_member_id\` CHAR(36) NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_families_congregation\` (\`congregation_id\`),
        KEY \`IDX_families_head_member\` (\`head_member_id\`),
        KEY \`IDX_families_congregation_name\` (\`congregation_id\`, \`name\`),
        CONSTRAINT \`FK_families_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_families_head_member\`
          FOREIGN KEY (\`head_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`family_members\` (
        \`family_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`relation\` ENUM('spouse', 'child', 'parent', 'sibling', 'other')
          NOT NULL DEFAULT 'other',
        \`joined_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`family_id\`, \`member_id\`),
        UNIQUE KEY \`UQ_family_members_member\` (\`member_id\`),
        KEY \`IDX_family_members_family_relation\` (\`family_id\`, \`relation\`),
        CONSTRAINT \`FK_family_members_family\`
          FOREIGN KEY (\`family_id\`) REFERENCES \`families\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_family_members_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `family_members`');
    await queryRunner.query('DROP TABLE `families`');
  }
}
