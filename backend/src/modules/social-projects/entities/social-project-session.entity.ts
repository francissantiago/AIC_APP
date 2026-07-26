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
import { SocialProjectAttendance } from './social-project-attendance.entity';
import { SocialProject } from './social-project.entity';

@Entity({ name: 'social_project_sessions' })
@Unique('UQ_social_project_sessions_project_date', [
  'socialProjectId',
  'sessionDate',
])
@Index('IDX_social_project_sessions_date', ['sessionDate'])
@Index('IDX_social_project_sessions_congregation', ['congregationId'])
export class SocialProjectSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'social_project_id', type: 'char', length: 36 })
  socialProjectId!: string;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  theme!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @ManyToOne(() => SocialProject, (project) => project.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'social_project_id' })
  socialProject!: SocialProject;

  @OneToMany(() => SocialProjectAttendance, (row) => row.session)
  attendance!: SocialProjectAttendance[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
