import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserCongregationsTable1785800000001 implements MigrationInterface {
  name = 'CreateUserCongregationsTable1785800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_congregations\` (
        \`user_id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`is_default\` TINYINT(1) NOT NULL DEFAULT 0,
        \`assigned_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`user_id\`, \`congregation_id\`),
        KEY \`IDX_user_congregations_congregation\` (\`congregation_id\`),
        KEY \`IDX_user_congregations_user_default\` (\`user_id\`, \`is_default\`),
        CONSTRAINT \`FK_user_congregations_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`FK_user_congregations_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`user_congregations\``);
  }
}
