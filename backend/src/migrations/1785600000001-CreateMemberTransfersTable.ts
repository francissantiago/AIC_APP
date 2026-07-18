import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMemberTransfersTable1785600000001 implements MigrationInterface {
  name = 'CreateMemberTransfersTable1785600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`member_transfers\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`member_id\` CHAR(36) NOT NULL,
        \`destination_church_name\` VARCHAR(200) NOT NULL,
        \`destination_city\` VARCHAR(100) NOT NULL,
        \`requested_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`approved_at\` DATETIME(6) NULL,
        \`status\` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
        \`document_id\` CHAR(36) NULL,
        \`notes\` TEXT NULL,
        \`requested_by_user_id\` CHAR(36) NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_member_transfers_member\` (\`member_id\`),
        KEY \`IDX_member_transfers_congregation_status\` (\`congregation_id\`, \`status\`),
        KEY \`IDX_member_transfers_document\` (\`document_id\`),
        KEY \`IDX_member_transfers_requested_by\` (\`requested_by_user_id\`),
        CONSTRAINT \`FK_member_transfers_congregation\`
          FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_member_transfers_member\`
          FOREIGN KEY (\`member_id\`) REFERENCES \`members\` (\`id\`),
        CONSTRAINT \`FK_member_transfers_document\`
          FOREIGN KEY (\`document_id\`) REFERENCES \`secretariat_documents\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_member_transfers_requested_by\`
          FOREIGN KEY (\`requested_by_user_id\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `member_transfers`');
  }
}
