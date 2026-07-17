import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_CATEGORIES = [
  ['Dízimos', 'income'],
  ['Ofertas', 'income'],
  ['Doações', 'income'],
  ['Outros', 'income'],
  ['Água', 'expense'],
  ['Energia', 'expense'],
  ['Aluguel', 'expense'],
  ['Manutenção', 'expense'],
  ['Ação social', 'expense'],
  ['Outros', 'expense'],
] as const;

export class SeedDefaultFinancialCategories1784300000002 implements MigrationInterface {
  name = 'SeedDefaultFinancialCategories1784300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const congregations = (await queryRunner.query(`
      SELECT \`id\`
      FROM \`congregations\`
      WHERE \`deleted_at\` IS NULL
      ORDER BY \`created_at\` ASC, \`id\` ASC
      LIMIT 1
    `)) as Array<{ id: string }>;

    if (congregations.length === 0) {
      return;
    }

    for (const [name, type] of DEFAULT_CATEGORIES) {
      await queryRunner.query(
        `
          INSERT IGNORE INTO \`financial_categories\` (
            \`id\`, \`congregation_id\`, \`name\`, \`type\`, \`active\`,
            \`is_default\`, \`created_at\`, \`updated_at\`
          ) VALUES (?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
        `,
        [randomUUID(), congregations[0].id, name, type],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE category
      FROM \`financial_categories\` category
      WHERE category.\`is_default\` = 1
        AND NOT EXISTS (
          SELECT 1
          FROM \`financial_entries\` entry
          WHERE entry.\`category_id\` = category.\`id\`
        )
    `);
  }
}
