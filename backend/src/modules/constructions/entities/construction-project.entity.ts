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
import { Ministry } from '../../ministries/entities/ministry.entity';
import { ConstructionProjectStatus } from '../enums/construction-project-status.enum';
import { ConstructionPhoto } from './construction-photo.entity';
import { ConstructionUpdate } from './construction-update.entity';

@Entity({ name: 'construction_projects' })
@Unique('UQ_construction_projects_congregation_name', [
  'congregationId',
  'name',
])
@Index('IDX_construction_projects_congregation_status', [
  'congregationId',
  'status',
])
@Index('IDX_construction_projects_ministry', ['ministryId'])
@Index('IDX_construction_projects_supervisor', ['supervisorMemberId'])
export class ConstructionProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'ministry_id', type: 'char', length: 36 })
  ministryId!: string;

  @ManyToOne(() => Ministry, { nullable: false })
  @JoinColumn({ name: 'ministry_id' })
  ministry!: Ministry;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({
    type: 'enum',
    enum: ConstructionProjectStatus,
    default: ConstructionProjectStatus.PLANNING,
  })
  status!: ConstructionProjectStatus;

  @Column({
    name: 'progress_percent',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  progressPercent!: number;

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

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'expected_end_date', type: 'date', nullable: true })
  expectedEndDate!: string | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate!: string | null;

  @Column({
    name: 'supervisor_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  supervisorMemberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supervisor_member_id' })
  supervisorMember!: Member | null;

  @OneToMany(() => ConstructionUpdate, (update) => update.constructionProject)
  updates!: ConstructionUpdate[];

  @OneToMany(() => ConstructionPhoto, (photo) => photo.constructionProject)
  photos!: ConstructionPhoto[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
