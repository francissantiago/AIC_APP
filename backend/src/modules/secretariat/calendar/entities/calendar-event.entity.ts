import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../../enums/secretariat.enums';

@Entity({ name: 'calendar_events' })
@Index('IDX_calendar_events_congregation_starts_at', [
  'congregationId',
  'startsAt',
])
@Index('IDX_calendar_events_congregation_type', ['congregationId', 'type'])
@Index('IDX_calendar_events_congregation_recurrence', [
  'congregationId',
  'recurrenceFrequency',
  'startsAt',
])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @Column({
    name: 'source_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  sourceMemberId!: string | null;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'enum', enum: CalendarEventType })
  type!: CalendarEventType;

  @Column({ name: 'starts_at', type: 'datetime', precision: 6 })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'datetime', precision: 6 })
  endsAt!: Date;

  @Column({ name: 'all_day', type: 'tinyint', width: 1, default: 0 })
  allDay!: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'recurrence_frequency',
    type: 'enum',
    enum: CalendarRecurrenceFrequency,
    default: CalendarRecurrenceFrequency.NONE,
  })
  recurrenceFrequency!: CalendarRecurrenceFrequency;

  @Column({ name: 'recurrence_interval', type: 'int', default: 1 })
  recurrenceInterval!: number;

  @Column({ name: 'recurrence_until', type: 'date', nullable: true })
  recurrenceUntil!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
