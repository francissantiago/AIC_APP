import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberIdToFinancialEntries1784600000001 implements MigrationInterface {
  name = 'AddMemberIdToFinancialEntries1784600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        ADD COLUMN \`member_id\` CHAR(36) NULL AFTER \`created_by_user_id\`,
        ADD INDEX \`IDX_financial_entries_member_date\` (\`member_id\`, \`entry_date\`),
        ADD CONSTRAINT \`FK_financial_entries_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_entries\`
        DROP FOREIGN KEY \`FK_financial_entries_member\`,
        DROP INDEX \`IDX_financial_entries_member_date\`,
        DROP COLUMN \`member_id\`
    `);
  }
}
