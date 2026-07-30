import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamilyMemberRelations1787200000001 implements MigrationInterface {
  name = 'AddFamilyMemberRelations1787200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`family_member_relations\` (
        \`id\` CHAR(36) NOT NULL,
        \`family_id\` CHAR(36) NOT NULL,
        \`from_member_id\` CHAR(36) NOT NULL,
        \`to_member_id\` CHAR(36) NOT NULL,
        \`relation\` ENUM('parent_of', 'spouse_of', 'sibling_of') NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_family_member_relations_edge\` (
          \`family_id\`, \`from_member_id\`, \`to_member_id\`, \`relation\`
        ),
        KEY \`IDX_family_member_relations_family\` (\`family_id\`),
        KEY \`IDX_family_member_relations_from\` (\`from_member_id\`),
        KEY \`IDX_family_member_relations_to\` (\`to_member_id\`),
        CONSTRAINT \`FK_family_member_relations_family\`
          FOREIGN KEY (\`family_id\`) REFERENCES \`families\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_family_member_relations_from_member\`
          FOREIGN KEY (\`from_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_family_member_relations_to_member\`
          FOREIGN KEY (\`to_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      INSERT INTO \`family_member_relations\` (
        \`id\`, \`family_id\`, \`from_member_id\`, \`to_member_id\`, \`relation\`
      )
      SELECT
        UUID(),
        fm_child.family_id,
        m.father_member_id,
        fm_child.member_id,
        'parent_of'
      FROM \`family_members\` fm_child
      INNER JOIN \`members\` m ON m.id = fm_child.member_id
      INNER JOIN \`family_members\` fm_father
        ON fm_father.member_id = m.father_member_id
        AND fm_father.family_id = fm_child.family_id
      WHERE m.father_member_id IS NOT NULL
        AND m.father_member_id <> fm_child.member_id
    `);

    await queryRunner.query(`
      INSERT INTO \`family_member_relations\` (
        \`id\`, \`family_id\`, \`from_member_id\`, \`to_member_id\`, \`relation\`
      )
      SELECT
        UUID(),
        fm_child.family_id,
        m.mother_member_id,
        fm_child.member_id,
        'parent_of'
      FROM \`family_members\` fm_child
      INNER JOIN \`members\` m ON m.id = fm_child.member_id
      INNER JOIN \`family_members\` fm_mother
        ON fm_mother.member_id = m.mother_member_id
        AND fm_mother.family_id = fm_child.family_id
      WHERE m.mother_member_id IS NOT NULL
        AND m.mother_member_id <> fm_child.member_id
        AND NOT EXISTS (
          SELECT 1 FROM \`family_member_relations\` existing
          WHERE existing.family_id = fm_child.family_id
            AND existing.from_member_id = m.mother_member_id
            AND existing.to_member_id = fm_child.member_id
            AND existing.relation = 'parent_of'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `family_member_relations`');
  }
}
