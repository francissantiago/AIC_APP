import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceAndAssetsTables1784300000001 implements MigrationInterface {
  name = 'CreateFinanceAndAssetsTables1784300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`financial_categories\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`type\` ENUM('income', 'expense') NOT NULL,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`is_default\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_financial_categories_congregation_type_name\` (\`congregation_id\`, \`type\`, \`name\`),
        KEY \`IDX_financial_categories_congregation_type_active\` (\`congregation_id\`, \`type\`, \`active\`),
        CONSTRAINT \`FK_financial_categories_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`financial_entries\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`category_id\` CHAR(36) NOT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`type\` ENUM('income', 'expense') NOT NULL,
        \`amount\` DECIMAL(13,2) NOT NULL,
        \`entry_date\` DATE NOT NULL,
        \`description\` VARCHAR(255) NOT NULL,
        \`payment_method\` ENUM('cash', 'pix', 'bank_transfer', 'card', 'other') NOT NULL DEFAULT 'other',
        \`reference\` VARCHAR(100) NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_financial_entries_congregation_date\` (\`congregation_id\`, \`entry_date\`),
        KEY \`IDX_financial_entries_congregation_type_date\` (\`congregation_id\`, \`type\`, \`entry_date\`),
        KEY \`IDX_financial_entries_category\` (\`category_id\`),
        KEY \`IDX_financial_entries_created_by\` (\`created_by_user_id\`),
        CONSTRAINT \`FK_financial_entries_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_financial_entries_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`financial_categories\` (\`id\`),
        CONSTRAINT \`FK_financial_entries_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`assets\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`created_by_user_id\` CHAR(36) NOT NULL,
        \`asset_tag\` VARCHAR(50) NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`type\` ENUM('property', 'vehicle', 'equipment', 'furniture', 'instrument', 'other') NOT NULL,
        \`acquisition_date\` DATE NULL,
        \`acquisition_value\` DECIMAL(13,2) NULL,
        \`current_value\` DECIMAL(13,2) NULL,
        \`location\` VARCHAR(150) NULL,
        \`status\` ENUM('active', 'maintenance', 'disposed') NOT NULL DEFAULT 'active',
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_assets_congregation_asset_tag\` (\`congregation_id\`, \`asset_tag\`),
        KEY \`IDX_assets_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_assets_congregation_type\` (\`congregation_id\`, \`type\`),
        KEY \`IDX_assets_created_by\` (\`created_by_user_id\`),
        CONSTRAINT \`FK_assets_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_assets_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `assets`');
    await queryRunner.query('DROP TABLE `financial_entries`');
    await queryRunner.query('DROP TABLE `financial_categories`');
  }
}
