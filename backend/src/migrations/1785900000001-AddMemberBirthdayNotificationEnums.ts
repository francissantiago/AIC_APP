import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemberBirthdayNotificationEnums1785900000001 implements MigrationInterface {
  name = 'AddMemberBirthdayNotificationEnums1785900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM('visitor_follow_up', 'schedule_reminder', 'member_birthday') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`reference_type\` ENUM('visitor', 'schedule_assignment', 'member') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications\`
      WHERE \`type\` = 'member_birthday'
         OR \`reference_type\` = 'member'
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM('visitor_follow_up', 'schedule_reminder') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`reference_type\` ENUM('visitor', 'schedule_assignment') NOT NULL
    `);
  }
}
