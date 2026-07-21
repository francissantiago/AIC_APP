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
  GoogleCalendarConflictPolicy,
  GoogleCalendarConnectionStatus,
  GoogleCalendarSyncDirection,
} from '../../enums/secretariat.enums';

@Entity({ name: 'google_calendar_connections' })
@Index('UQ_google_calendar_connections_congregation', ['congregationId'], {
  unique: true,
})
@Index('IDX_google_calendar_connections_status', ['status', 'deletedAt'])
export class GoogleCalendarConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'connected_by_user_id', type: 'char', length: 36 })
  connectedByUserId!: string;

  @Column({ name: 'google_account_email', type: 'varchar', length: 255 })
  googleAccountEmail!: string;

  @Column({
    name: 'google_calendar_id',
    type: 'varchar',
    length: 255,
    default: 'primary',
  })
  googleCalendarId!: string;

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted!: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text' })
  refreshTokenEncrypted!: string;

  @Column({ name: 'token_expires_at', type: 'datetime', precision: 6 })
  tokenExpiresAt!: Date;

  @Column({ type: 'varchar', length: 500 })
  scopes!: string;

  @Column({ name: 'sync_token', type: 'varchar', length: 1024, nullable: true })
  syncToken!: string | null;

  @Column({
    name: 'sync_direction',
    type: 'enum',
    enum: GoogleCalendarSyncDirection,
    default: GoogleCalendarSyncDirection.BIDIRECTIONAL,
  })
  syncDirection!: GoogleCalendarSyncDirection;

  @Column({
    name: 'conflict_policy',
    type: 'enum',
    enum: GoogleCalendarConflictPolicy,
    default: GoogleCalendarConflictPolicy.LATEST_WINS,
  })
  conflictPolicy!: GoogleCalendarConflictPolicy;

  @Column({
    type: 'enum',
    enum: GoogleCalendarConnectionStatus,
    default: GoogleCalendarConnectionStatus.ACTIVE,
  })
  status!: GoogleCalendarConnectionStatus;

  @Column({
    name: 'last_sync_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  lastSyncAt!: Date | null;

  @Column({ name: 'last_sync_error', type: 'text', nullable: true })
  lastSyncError!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
