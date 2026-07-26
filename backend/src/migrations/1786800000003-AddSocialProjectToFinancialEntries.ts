import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialProjectToFinancialEntries1786800000003 implements MigrationInterface {
  name = 'AddSocialProjectToFinancialEntries1786800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        ADD COLUMN \`social_project_id\` CHAR(36) NULL AFTER \`construction_project_id\`,
        ADD INDEX \`IDX_financial_entries_social_project\` (\`social_project_id\`),
        ADD CONSTRAINT \`FK_financial_entries_social_project\`
          FOREIGN KEY (\`social_project_id\`) REFERENCES \`social_projects\` (\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        DROP FOREIGN KEY \`FK_financial_entries_social_project\`,
        DROP INDEX \`IDX_financial_entries_social_project\`,
        DROP COLUMN \`social_project_id\`
    `);
  }
}
