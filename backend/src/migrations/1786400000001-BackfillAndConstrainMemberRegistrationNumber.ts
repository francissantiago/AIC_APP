import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillAndConstrainMemberRegistrationNumber1786400000001
  implements MigrationInterface
{
  name = 'BackfillAndConstrainMemberRegistrationNumber1786400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`members\` m
      INNER JOIN (
        SELECT
          \`id\`,
          LPAD(
            ROW_NUMBER() OVER (
              PARTITION BY \`congregation_id\`
              ORDER BY \`created_at\` ASC, \`id\` ASC
            ),
            6,
            '0'
          ) AS \`seq\`
        FROM \`members\`
      ) numbered ON numbered.\`id\` = m.\`id\`
      SET m.\`registration_number\` = numbered.\`seq\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`members\`
        MODIFY COLUMN \`registration_number\` CHAR(6) NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX \`UQ_members_congregation_registration_number\`
        ON \`members\` (\`congregation_id\`, \`registration_number\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`UQ_members_congregation_registration_number\` ON \`members\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`members\`
        MODIFY COLUMN \`registration_number\` VARCHAR(50) NULL
    `);
  }
}
