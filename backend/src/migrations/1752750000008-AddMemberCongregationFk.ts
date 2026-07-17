import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberCongregationFk1752750000008 implements MigrationInterface {
  name = 'AddMemberCongregationFk1752750000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        ADD COLUMN \`congregation_id\` CHAR(36) NULL
    `);

    await queryRunner.query(`
      UPDATE \`members\`
      SET \`congregation_id\` = (
        SELECT \`id\`
        FROM \`congregations\`
        WHERE \`deleted_at\` IS NULL
        ORDER BY \`created_at\` ASC, \`id\` ASC
        LIMIT 1
      )
      WHERE \`congregation_id\` IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`members\`
        MODIFY COLUMN \`congregation_id\` CHAR(36) NOT NULL,
        ADD KEY \`IDX_members_congregation_id\` (\`congregation_id\`),
        ADD CONSTRAINT \`FK_members_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        DROP FOREIGN KEY \`FK_members_congregation\`,
        DROP KEY \`IDX_members_congregation_id\`,
        DROP COLUMN \`congregation_id\`
    `);
  }
}
