import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillUserCongregationsToHeadquarters1785800000002 implements MigrationInterface {
  name = 'BackfillUserCongregationsToHeadquarters1785800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const headquarters = (await queryRunner.query(`
      SELECT \`id\` FROM \`congregations\`
      WHERE \`type\` = 'headquarters' AND \`parent_id\` IS NULL AND \`deleted_at\` IS NULL
      ORDER BY \`created_at\` ASC, \`id\` ASC
      LIMIT 1
    `)) as Array<{ id: string }>;

    if (headquarters.length === 0) {
      throw new Error(
        'Backfill de user_congregations abortado: nenhuma HQ ativa encontrada ' +
          '(inesperado após o ciclo 2, que garante getOrCreateBase() sempre criar uma).',
      );
    }

    const hqId = headquarters[0].id;

    await queryRunner.query(
      `
      INSERT INTO \`user_congregations\`
        (\`user_id\`, \`congregation_id\`, \`is_default\`, \`assigned_at\`)
      SELECT \`u\`.\`id\`, ?, 1, NOW(6)
      FROM \`users\` \`u\`
      WHERE \`u\`.\`status\` = 'active'
        AND \`u\`.\`deleted_at\` IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM \`user_congregations\` \`uc\`
          WHERE \`uc\`.\`user_id\` = \`u\`.\`id\`
        )
      `,
      [hqId],
    );
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    void _queryRunner;
    // Aditiva/idempotente por natureza — rollback é no-op documentado.
    return Promise.resolve();
  }
}
