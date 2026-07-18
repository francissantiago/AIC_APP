import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassEnrollmentsTable1784800000001 implements MigrationInterface {
  name = 'CreateClassEnrollmentsTable1784800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`class_enrollments\` (
        \`class_id\` char(36) NOT NULL,
        \`member_id\` char(36) NOT NULL,
        \`status\` enum('active','inactive','transferred') NOT NULL DEFAULT 'active',
        \`enrolled_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`class_id\`, \`member_id\`),
        KEY \`IDX_class_enrollments_member\` (\`member_id\`),
        KEY \`IDX_class_enrollments_class_status\` (\`class_id\`, \`status\`),
        CONSTRAINT \`FK_class_enrollments_class\`
          FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`FK_class_enrollments_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `class_enrollments`');
  }
}
