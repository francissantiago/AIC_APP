import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { SocialProjectSession } from './social-project-session.entity';

@Entity({ name: 'social_project_attendance' })
@Unique('UQ_social_project_attendance_session_member', [
  'sessionId',
  'memberId',
])
@Index('IDX_social_project_attendance_member', ['memberId'])
export class SocialProjectAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'char', length: 36 })
  sessionId!: string;

  @Column({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({ type: 'boolean' })
  present!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @ManyToOne(() => SocialProjectSession, (session) => session.attendance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: SocialProjectSession;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
