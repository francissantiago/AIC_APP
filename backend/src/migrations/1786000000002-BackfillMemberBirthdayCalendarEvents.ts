import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillMemberBirthdayCalendarEvents1786000000002 implements MigrationInterface {
  name = 'BackfillMemberBirthdayCalendarEvents1786000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const authors = (await queryRunner.query(`
      SELECT \`u\`.\`id\`
      FROM \`users\` \`u\`
      INNER JOIN \`user_roles\` \`ur\` ON \`ur\`.\`user_id\` = \`u\`.\`id\`
      INNER JOIN \`role_permissions\` \`rp\` ON \`rp\`.\`role_id\` = \`ur\`.\`role_id\`
      INNER JOIN \`permissions\` \`p\` ON \`p\`.\`id\` = \`rp\`.\`permission_id\`
      WHERE \`u\`.\`status\` = 'active'
        AND \`u\`.\`deleted_at\` IS NULL
        AND \`p\`.\`code\` = 'secretariat:write'
      ORDER BY \`u\`.\`created_at\` ASC, \`u\`.\`id\` ASC
      LIMIT 1
    `)) as Array<{ id: string }>;

    if (authors.length === 0) {
      throw new Error(
        'Backfill de eventos de aniversário abortado: nenhum usuário ativo com secretariat:write.',
      );
    }

    const authorUserId = authors[0].id;

    await queryRunner.query(
      `
      INSERT INTO \`calendar_events\` (
        \`id\`,
        \`congregation_id\`,
        \`created_by_user_id\`,
        \`source_member_id\`,
        \`title\`,
        \`type\`,
        \`starts_at\`,
        \`ends_at\`,
        \`all_day\`,
        \`location\`,
        \`description\`,
        \`recurrence_frequency\`,
        \`recurrence_interval\`,
        \`recurrence_until\`,
        \`created_at\`,
        \`updated_at\`
      )
      SELECT
        UUID(),
        \`m\`.\`congregation_id\`,
        ?,
        \`m\`.\`id\`,
        CONCAT('Aniversário: ', \`m\`.\`full_name\`),
        'birthday',
        TIMESTAMP(
          CONCAT(
            YEAR(CURDATE()),
            '-',
            DATE_FORMAT(\`m\`.\`birth_date\`, '%m-%d'),
            ' 00:00:00.000000'
          )
        ),
        TIMESTAMP(
          CONCAT(
            YEAR(CURDATE()),
            '-',
            DATE_FORMAT(\`m\`.\`birth_date\`, '%m-%d'),
            ' 23:59:59.999000'
          )
        ),
        1,
        NULL,
        'Evento gerado automaticamente a partir do cadastro de membro.',
        'yearly',
        1,
        NULL,
        NOW(6),
        NOW(6)
      FROM \`members\` \`m\`
      WHERE \`m\`.\`status\` = 'active'
        AND \`m\`.\`birth_date\` IS NOT NULL
        AND \`m\`.\`deleted_at\` IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM \`calendar_events\` \`ce\`
          WHERE \`ce\`.\`source_member_id\` = \`m\`.\`id\`
            AND \`ce\`.\`congregation_id\` = \`m\`.\`congregation_id\`
        )
      `,
      [authorUserId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`calendar_events\`
      SET \`deleted_at\` = NOW(6)
      WHERE \`type\` = 'birthday'
        AND \`source_member_id\` IS NOT NULL
        AND \`deleted_at\` IS NULL
    `);
  }
}
