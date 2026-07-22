import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberFiliationMemberIds1786500000001 implements MigrationInterface {
  name = 'AddMemberFiliationMemberIds1786500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`members\`
        ADD COLUMN \`father_member_id\` CHAR(36) NULL,
        ADD COLUMN \`mother_member_id\` CHAR(36) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`members\`
        ADD CONSTRAINT \`FK_members_father_member\`
          FOREIGN KEY (\`father_member_id\`) REFERENCES \`members\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION,
        ADD CONSTRAINT \`FK_members_mother_member\`
          FOREIGN KEY (\`mother_member_id\`) REFERENCES \`members\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_members_father_member_id\` ON \`members\` (\`father_member_id\`)
    `);
    await queryRunner.query(`
      CREATE INDEX \`IDX_members_mother_member_id\` ON \`members\` (\`mother_member_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`IDX_members_mother_member_id\` ON \`members\`
    `);
    await queryRunner.query(`
      DROP INDEX \`IDX_members_father_member_id\` ON \`members\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`members\`
        DROP FOREIGN KEY \`FK_members_mother_member\`,
        DROP FOREIGN KEY \`FK_members_father_member\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`members\`
        DROP COLUMN \`mother_member_id\`,
        DROP COLUMN \`father_member_id\`
    `);
  }
}
