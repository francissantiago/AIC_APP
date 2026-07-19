import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCongregationHierarchy1785700000001 implements MigrationInterface {
  name = 'AddCongregationHierarchy1785700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`congregations\`
        ADD COLUMN \`parent_id\` CHAR(36) NULL AFTER \`type\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`congregations\`
        ADD KEY \`IDX_congregations_parent_id\` (\`parent_id\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`congregations\`
        ADD CONSTRAINT \`FK_congregations_parent\`
          FOREIGN KEY (\`parent_id\`) REFERENCES \`congregations\` (\`id\`)
          ON DELETE RESTRICT
    `);

    // Backfill defensivo: garante a invariante "toda linha sem parent_id é
    // headquarters", mesmo se dados de dev tiverem ficado com type=branch
    // por engano no singleton antigo.
    await queryRunner.query(`
      UPDATE \`congregations\`
      SET \`type\` = 'headquarters'
      WHERE \`parent_id\` IS NULL AND \`deleted_at\` IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS total FROM \`congregations\`
       WHERE \`parent_id\` IS NOT NULL AND \`deleted_at\` IS NULL`,
    )) as Array<{ total: string | number }>;
    const total = Number(rows[0]?.total ?? 0);
    if (total > 0) {
      throw new Error(
        'Rollback bloqueado: existem filiais ativas vinculadas via parent_id. Remova/soft-delete todas antes de reverter.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`congregations\`
        DROP FOREIGN KEY \`FK_congregations_parent\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`congregations\`
        DROP KEY \`IDX_congregations_parent_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`congregations\`
        DROP COLUMN \`parent_id\`
    `);
  }
}
