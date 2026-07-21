import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberMembershipCardFields1786200000001 implements MigrationInterface {
  name = 'AddMemberMembershipCardFields1786200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        ADD COLUMN \`rg\` VARCHAR(30) NULL,
        ADD COLUMN \`place_of_birth\` VARCHAR(150) NULL,
        ADD COLUMN \`blood_type\` VARCHAR(10) NULL,
        ADD COLUMN \`father_name\` VARCHAR(150) NULL,
        ADD COLUMN \`mother_name\` VARCHAR(150) NULL,
        ADD COLUMN \`position_title\` VARCHAR(100) NULL,
        ADD COLUMN \`photo_path\` VARCHAR(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        DROP COLUMN \`photo_path\`,
        DROP COLUMN \`position_title\`,
        DROP COLUMN \`mother_name\`,
        DROP COLUMN \`father_name\`,
        DROP COLUMN \`blood_type\`,
        DROP COLUMN \`place_of_birth\`,
        DROP COLUMN \`rg\`
    `);
  }
}
