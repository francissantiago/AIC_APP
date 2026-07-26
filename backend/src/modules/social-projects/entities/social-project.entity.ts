import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { Member } from '../../members/entities/member.entity';
import { SocialProjectCategory } from '../enums/social-project-category.enum';
import { SocialProjectStatus } from '../enums/social-project-status.enum';
import { SocialProjectMember } from './social-project-member.entity';
import { SocialProjectSession } from './social-project-session.entity';

@Entity({ name: 'social_projects' })
@Unique('UQ_social_projects_congregation_name', ['congregationId', 'name'])
@Index('IDX_social_projects_congregation_status', ['congregationId', 'status'])
@Index('IDX_social_projects_congregation_category', [
  'congregationId',
  'category',
])
@Index('IDX_social_projects_leader_member', ['leaderMemberId'])
export class SocialProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: SocialProjectCategory,
    default: SocialProjectCategory.OTHER,
  })
  category!: SocialProjectCategory;

  @Column({
    name: 'leader_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  leaderMemberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leader_member_id' })
  leaderMember!: Member | null;

  @Column({
    name: 'day_of_week',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({
    name: 'budget_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  budgetAmount!: string | null;

  @Column({
    name: 'spent_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: '0.00',
  })
  spentAmount!: string;

  @Column({
    type: 'enum',
    enum: SocialProjectStatus,
    default: SocialProjectStatus.ACTIVE,
  })
  status!: SocialProjectStatus;

  @OneToMany(() => SocialProjectMember, (link) => link.socialProject)
  members!: SocialProjectMember[];

  @OneToMany(() => SocialProjectSession, (session) => session.socialProject)
  sessions!: SocialProjectSession[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
