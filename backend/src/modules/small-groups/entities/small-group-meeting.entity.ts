import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SmallGroup } from './small-group.entity';
import { SmallGroupAttendance } from './small-group-attendance.entity';

@Entity({ name: 'small_group_meetings' })
@Unique('UQ_small_group_meetings_group_date', ['smallGroupId', 'meetingDate'])
@Index('IDX_small_group_meetings_date', ['meetingDate'])
export class SmallGroupMeeting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'small_group_id', type: 'char', length: 36 })
  smallGroupId!: string;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  theme!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @ManyToOne(() => SmallGroup, (group) => group.meetings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'small_group_id' })
  smallGroup!: SmallGroup;

  @OneToMany(() => SmallGroupAttendance, (row) => row.meeting)
  attendance!: SmallGroupAttendance[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
