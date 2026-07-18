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
import { EbdClass } from './class.entity';

@Entity({ name: 'class_attendance' })
@Unique('UQ_class_attendance_session_member', [
  'classId',
  'memberId',
  'sessionDate',
])
@Index('IDX_class_attendance_class_date', ['classId', 'sessionDate'])
@Index('IDX_class_attendance_member_date', ['memberId', 'sessionDate'])
export class ClassAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'class_id', type: 'char', length: 36 })
  classId!: string;

  @Column({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate!: string;

  @Column({ type: 'boolean' })
  present!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @ManyToOne(() => EbdClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  ebdClass!: EbdClass;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
