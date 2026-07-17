import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureCongregationSingleton1752750000007 implements MigrationInterface {
  name = 'EnsureCongregationSingleton1752750000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT \`id\`
      FROM \`congregations\`
      WHERE \`deleted_at\` IS NULL
      ORDER BY \`created_at\` ASC, \`id\` ASC
    `)) as Array<{ id: string }>;

    if (rows.length > 1) {
      const extraIds = rows.slice(1).map((row) => row.id);
      await queryRunner.query(
        `
          UPDATE \`congregations\`
          SET \`deleted_at\` = CURRENT_TIMESTAMP(6)
          WHERE \`id\` IN (${extraIds.map(() => '?').join(', ')})
            AND \`deleted_at\` IS NULL
        `,
        extraIds,
      );
    } else if (rows.length === 0) {
      await queryRunner.query(
        `
          INSERT INTO \`congregations\` (
            \`id\`, \`name\`, \`type\`, \`status\`, \`created_at\`, \`updated_at\`
          ) VALUES (?, ?, 'headquarters', 'active', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
        `,
        [randomUUID(), 'Congregação'],
      );
    }
  }

  public async down(): Promise<void> {
    // No-op: evitar perda de dados ao reverter o seed do singleton.
  }
}
