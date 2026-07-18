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
import { Ministry } from '../../ministries/entities/ministry.entity';
import { CalendarEvent } from '../../secretariat/calendar/entities/calendar-event.entity';

@Entity({ name: 'schedule_assignments' })
@Unique('UQ_schedule_assignments_event_ministry_member', [
  'calendarEventId',
  'ministryId',
  'memberId',
])
@Index('IDX_schedule_assignments_event', ['calendarEventId'])
@Index('IDX_schedule_assignments_ministry', ['ministryId'])
@Index('IDX_schedule_assignments_member', ['memberId'])
@Index('IDX_schedule_assignments_confirmed', ['confirmed'])
export class ScheduleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'calendar_event_id', type: 'char', length: 36 })
  calendarEventId!: string;

  @ManyToOne(() => CalendarEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'calendar_event_id' })
  calendarEvent!: CalendarEvent;

  @Column({ name: 'ministry_id', type: 'char', length: 36 })
  ministryId!: string;

  @ManyToOne(() => Ministry, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ministry_id' })
  ministry!: Ministry;

  @Column({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;

  @Column({ name: 'role_label', type: 'varchar', length: 80 })
  roleLabel!: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  confirmed!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
