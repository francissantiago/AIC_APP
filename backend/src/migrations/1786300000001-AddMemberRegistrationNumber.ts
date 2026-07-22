import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberRegistrationNumber1786300000001 implements MigrationInterface {
  name = 'AddMemberRegistrationNumber1786300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        ADD COLUMN \`registration_number\` VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        DROP COLUMN \`registration_number\`
    `);
  }
}
