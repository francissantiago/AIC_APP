import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'visitors' })
@Index('IDX_visitors_congregation_visit_date', ['congregationId', 'visitDate'])
@Index('IDX_visitors_congregation_follow_up_done', [
  'congregationId',
  'followUpDone',
])
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: 'visit_date', type: 'date' })
  visitDate!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'follow_up_done', type: 'tinyint', width: 1, default: 0 })
  followUpDone!: boolean;

  @Column({ name: 'member_id', type: 'char', length: 36, nullable: true })
  memberId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
