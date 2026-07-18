import { MigrationInterface, QueryRunner } from 'typeorm';

const RESTRICTED_ROLE_CODES = ['LEADER', 'MEMBER'] as const;

const REMOVED_WRITE_PERMISSIONS = [
  'users:write',
  'members:write',
  'congregations:write',
] as const;

export class RestrictLeaderMemberWritePermissions1784500000003 implements MigrationInterface {
  name = 'RestrictLeaderMemberWritePermissions1784500000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const roleCode of RESTRICTED_ROLE_CODES) {
      for (const permissionCode of REMOVED_WRITE_PERMISSIONS) {
        await queryRunner.query(
          `DELETE rp FROM \`role_permissions\` rp
           INNER JOIN \`roles\` r ON r.\`id\` = rp.\`role_id\`
           INNER JOIN \`permissions\` p ON p.\`id\` = rp.\`permission_id\`
           WHERE r.\`code\` = ? AND p.\`code\` = ?`,
          [roleCode, permissionCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const roleCode of RESTRICTED_ROLE_CODES) {
      for (const permissionCode of REMOVED_WRITE_PERMISSIONS) {
        await queryRunner.query(
          `INSERT IGNORE INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
           SELECT r.\`id\`, p.\`id\`
           FROM \`roles\` r, \`permissions\` p
           WHERE r.\`code\` = ? AND p.\`code\` = ?`,
          [roleCode, permissionCode],
        );
      }
    }
  }
}
