import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecretariatDocumentFileColumns1785200000001 implements MigrationInterface {
  name = 'AddSecretariatDocumentFileColumns1785200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`secretariat_documents\`
        ADD COLUMN \`file_path\` varchar(500) NULL AFTER \`status\`,
        ADD COLUMN \`original_filename\` varchar(255) NULL AFTER \`file_path\`,
        ADD COLUMN \`mime_type\` varchar(120) NULL AFTER \`original_filename\`,
        ADD COLUMN \`size_bytes\` int unsigned NULL AFTER \`mime_type\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`secretariat_documents\`
        DROP COLUMN \`size_bytes\`,
        DROP COLUMN \`mime_type\`,
        DROP COLUMN \`original_filename\`,
        DROP COLUMN \`file_path\`
    `);
  }
}
