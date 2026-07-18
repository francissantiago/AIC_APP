import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationReferenceType } from '../enums/notification-reference-type.enum';
import { NotificationType } from '../enums/notification-type.enum';

@Entity({ name: 'notifications' })
@Unique('UQ_notifications_user_type_ref', ['userId', 'type', 'referenceId'])
@Index('IDX_notifications_user_created', ['userId', 'createdAt'])
@Index('IDX_notifications_user_unread', ['userId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: NotificationReferenceType,
  })
  referenceType!: NotificationReferenceType;

  @Column({ name: 'reference_id', type: 'char', length: 36 })
  referenceId!: string;

  @Column({
    name: 'read_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;
}
