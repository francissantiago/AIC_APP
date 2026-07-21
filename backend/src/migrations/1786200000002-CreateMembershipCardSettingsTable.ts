import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMembershipCardSettingsTable1786200000002 implements MigrationInterface {
  name = 'CreateMembershipCardSettingsTable1786200000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`membership_card_settings\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`header_line1\` VARCHAR(150) NOT NULL,
        \`header_line2\` VARCHAR(150) NULL,
        \`ministry_label\` VARCHAR(150) NULL,
        \`president_name\` VARCHAR(150) NULL,
        \`president_title\` VARCHAR(100) NOT NULL DEFAULT 'PASTORA PRESIDENTE',
        \`logo_path\` VARCHAR(500) NULL,
        \`signature_path\` VARCHAR(500) NULL,
        \`validity_months\` INT UNSIGNED NOT NULL DEFAULT 24,
        \`footer_notice\` VARCHAR(255) NOT NULL DEFAULT 'Válida somente com a apresentação de documento de identificação com foto',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_membership_card_settings_congregation\` (\`congregation_id\`),
        CONSTRAINT \`FK_membership_card_settings_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `membership_card_settings`');
  }
}
