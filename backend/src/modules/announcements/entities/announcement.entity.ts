import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { User } from '../../users/entities/user.entity';
import { AnnouncementAudience } from '../enums/announcement-audience.enum';

@Entity({ name: 'announcements' })
@Index('IDX_announcements_congregation', ['congregationId'])
@Index('IDX_announcements_author', ['authorUserId'])
@Index('IDX_announcements_board', [
  'congregationId',
  'publishedAt',
  'expiresAt',
  'deletedAt',
])
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({
    type: 'enum',
    enum: AnnouncementAudience,
    default: AnnouncementAudience.ALL,
  })
  audience!: AnnouncementAudience;

  @Column({ name: 'audience_targets', type: 'json', nullable: true })
  audienceTargets!: string[] | null;

  @Column({ name: 'published_at', type: 'datetime', precision: 6 })
  publishedAt!: Date;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  expiresAt!: Date | null;

  @Column({ name: 'author_user_id', type: 'char', length: 36 })
  authorUserId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_user_id' })
  author!: User;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
