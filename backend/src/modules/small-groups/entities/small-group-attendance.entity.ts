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
import { SmallGroupMeeting } from './small-group-meeting.entity';

@Entity({ name: 'small_group_attendance' })
@Unique('UQ_small_group_attendance_meeting_member', ['meetingId', 'memberId'])
@Index('IDX_small_group_attendance_member', ['memberId'])
export class SmallGroupAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'meeting_id', type: 'char', length: 36 })
  meetingId!: string;

  @Column({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({ type: 'boolean' })
  present!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @ManyToOne(() => SmallGroupMeeting, (meeting) => meeting.attendance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting!: SmallGroupMeeting;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
