import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConstructionProjectToFinancialEntries1786700000003 implements MigrationInterface {
  name = 'AddConstructionProjectToFinancialEntries1786700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        ADD COLUMN \`construction_project_id\` CHAR(36) NULL AFTER \`member_id\`,
        ADD INDEX \`IDX_financial_entries_construction_project\` (\`construction_project_id\`),
        ADD CONSTRAINT \`FK_financial_entries_construction_project\`
          FOREIGN KEY (\`construction_project_id\`) REFERENCES \`construction_projects\` (\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        DROP FOREIGN KEY \`FK_financial_entries_construction_project\`,
        DROP INDEX \`IDX_financial_entries_construction_project\`,
        DROP COLUMN \`construction_project_id\`
    `);
  }
}
