import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTokenVersion1787000000001 implements MigrationInterface {
  name = 'AddUserTokenVersion1787000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`token_version\` INT NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`token_version\`
    `);
  }
}
