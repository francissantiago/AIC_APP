import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissionFieldsToFinancialEntries1786900000002 implements MigrationInterface {
  name = 'AddMissionFieldsToFinancialEntries1786900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        ADD COLUMN \`mission_field_id\` CHAR(36) NULL AFTER \`social_project_id\`,
        ADD COLUMN \`mission_booklet_installment_id\` CHAR(36) NULL AFTER \`mission_field_id\`,
        ADD INDEX \`IDX_financial_entries_mission_field\` (\`mission_field_id\`),
        ADD INDEX \`IDX_financial_entries_mission_booklet_installment\` (\`mission_booklet_installment_id\`),
        ADD CONSTRAINT \`FK_financial_entries_mission_field\`
          FOREIGN KEY (\`mission_field_id\`) REFERENCES \`mission_fields\` (\`id\`) ON DELETE SET NULL,
        ADD CONSTRAINT \`FK_financial_entries_mission_booklet_installment\`
          FOREIGN KEY (\`mission_booklet_installment_id\`) REFERENCES \`mission_booklet_installments\` (\`id\`) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`mission_booklet_installments\`
        ADD CONSTRAINT \`FK_mission_booklet_installments_financial_entry\`
          FOREIGN KEY (\`financial_entry_id\`) REFERENCES \`financial_entries\` (\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`mission_booklet_installments\`
        DROP FOREIGN KEY \`FK_mission_booklet_installments_financial_entry\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        DROP FOREIGN KEY \`FK_financial_entries_mission_booklet_installment\`,
        DROP FOREIGN KEY \`FK_financial_entries_mission_field\`,
        DROP INDEX \`IDX_financial_entries_mission_booklet_installment\`,
        DROP INDEX \`IDX_financial_entries_mission_field\`,
        DROP COLUMN \`mission_booklet_installment_id\`,
        DROP COLUMN \`mission_field_id\`
    `);
  }
}
