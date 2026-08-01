import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConstructionProjectStagesAndRemoveMinistry1787300000001 implements MigrationInterface {
  name = 'ConstructionProjectStagesAndRemoveMinistry1787300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`construction_projects\`
        DROP FOREIGN KEY \`FK_construction_projects_ministry\`,
        DROP INDEX \`IDX_construction_projects_ministry\`,
        DROP COLUMN \`ministry_id\`
    `);

    await queryRunner.query(`
      CREATE TABLE \`construction_project_stages\` (
        \`id\` CHAR(36) NOT NULL,
        \`congregation_id\` CHAR(36) NOT NULL,
        \`construction_project_id\` CHAR(36) NOT NULL,
        \`title\` VARCHAR(120) NOT NULL,
        \`sort_order\` SMALLINT UNSIGNED NOT NULL,
        \`completed_at\` DATETIME(6) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` DATETIME(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_construction_project_stages_project\` (\`construction_project_id\`),
        KEY \`IDX_construction_project_stages_congregation\` (\`congregation_id\`),
        CONSTRAINT \`FK_construction_project_stages_congregation\` FOREIGN KEY (\`congregation_id\`) REFERENCES \`congregations\` (\`id\`),
        CONSTRAINT \`FK_construction_project_stages_project\` FOREIGN KEY (\`construction_project_id\`) REFERENCES \`construction_projects\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `construction_project_stages`');

    await queryRunner.query(`
      ALTER TABLE \`construction_projects\`
        ADD COLUMN \`ministry_id\` CHAR(36) NOT NULL AFTER \`congregation_id\`,
        ADD KEY \`IDX_construction_projects_ministry\` (\`ministry_id\`),
        ADD CONSTRAINT \`FK_construction_projects_ministry\` FOREIGN KEY (\`ministry_id\`) REFERENCES \`ministries\` (\`id\`)
    `);
  }
}
