import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceEventType } from '../../enums/secretariat.enums';

@Entity({ name: 'attendance_records' })
@Index('IDX_attendance_records_congregation_event_date', [
  'congregationId',
  'eventDate',
])
@Index('IDX_attendance_records_calendar_event', ['calendarEventId'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @Column({ name: 'event_date', type: 'date' })
  eventDate!: string;

  @Column({ name: 'event_type', type: 'enum', enum: AttendanceEventType })
  eventType!: AttendanceEventType;

  @Column({
    name: 'calendar_event_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  calendarEventId!: string | null;

  @Column({ name: 'total_present', type: 'int' })
  totalPresent!: number;

  @Column({ type: 'int', nullable: true })
  adults!: number | null;

  @Column({ type: 'int', nullable: true })
  children!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
