import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORY_NAME = 'Missões';
const CATEGORY_TYPE = 'income';

export class SeedMissionsFinancialCategory1786900000003 implements MigrationInterface {
  name = 'SeedMissionsFinancialCategory1786900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const congregations = (await queryRunner.query(`
      SELECT \`id\`
      FROM \`congregations\`
      WHERE \`deleted_at\` IS NULL
    `)) as Array<{ id: string }>;

    for (const congregation of congregations) {
      await queryRunner.query(
        `
          INSERT IGNORE INTO \`financial_categories\` (
            \`id\`, \`congregation_id\`, \`name\`, \`type\`, \`active\`,
            \`is_default\`, \`created_at\`, \`updated_at\`
          ) VALUES (?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
        `,
        [randomUUID(), congregation.id, CATEGORY_NAME, CATEGORY_TYPE],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE category
        FROM \`financial_categories\` category
        WHERE category.\`name\` = ?
          AND category.\`type\` = ?
          AND category.\`is_default\` = 1
          AND NOT EXISTS (
            SELECT 1
            FROM \`financial_entries\` entry
            WHERE entry.\`category_id\` = category.\`id\`
          )
      `,
      [CATEGORY_NAME, CATEGORY_TYPE],
    );
  }
}
