import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_ROLES: ReadonlyArray<{
  code: string;
  name: string;
  description: string;
}> = [
  {
    code: 'ADMIN',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
  },
  {
    code: 'PASTOR',
    name: 'Pastor/Líder',
    description: 'Liderança espiritual; visão geral da organização',
  },
  {
    code: 'TREASURER',
    name: 'Tesoureiro',
    description: 'Gestão financeira (dízimos, ofertas, despesas)',
  },
  {
    code: 'SECRETARY',
    name: 'Secretário(a)',
    description: 'Gestão de cadastros, atas e documentos',
  },
  {
    code: 'LEADER',
    name: 'Líder de Ministério',
    description: 'Gestão de ministérios/departamentos específicos',
  },
  {
    code: 'MEMBER',
    name: 'Membro',
    description: 'Acesso básico de membro comum',
  },
];

export class SeedDefaultRoles1752750000004 implements MigrationInterface {
  name = 'SeedDefaultRoles1752750000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const role of DEFAULT_ROLES) {
      await queryRunner.query(
        `INSERT INTO \`roles\` (\`code\`, \`name\`, \`description\`)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`description\` = VALUES(\`description\`)`,
        [role.code, role.name, role.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`roles\` WHERE \`code\` IN (${DEFAULT_ROLES.map(() => '?').join(', ')})`,
      DEFAULT_ROLES.map((role) => role.code),
    );
  }
}
