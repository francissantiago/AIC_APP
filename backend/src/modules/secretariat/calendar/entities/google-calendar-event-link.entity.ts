import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'google_calendar_event_links' })
@Index('UQ_gcal_link_connection_event', ['connectionId', 'calendarEventId'], {
  unique: true,
})
@Index('UQ_gcal_link_connection_google', ['connectionId', 'googleEventId'], {
  unique: true,
})
@Index('IDX_gcal_link_calendar_event', ['calendarEventId'])
export class GoogleCalendarEventLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'connection_id', type: 'char', length: 36 })
  connectionId!: string;

  @Column({ name: 'calendar_event_id', type: 'char', length: 36 })
  calendarEventId!: string;

  @Column({ name: 'google_event_id', type: 'varchar', length: 255 })
  googleEventId!: string;

  @Column({ name: 'google_etag', type: 'varchar', length: 255, nullable: true })
  googleEtag!: string | null;

  @Column({
    name: 'last_pushed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  lastPushedAt!: Date | null;

  @Column({
    name: 'last_pulled_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  lastPulledAt!: Date | null;

  @Column({ name: 'content_hash', type: 'char', length: 64, nullable: true })
  contentHash!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
