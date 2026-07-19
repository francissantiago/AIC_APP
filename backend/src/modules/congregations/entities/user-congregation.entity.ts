import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Congregation } from './congregation.entity';

@Entity({ name: 'user_congregations' })
@Index('IDX_user_congregations_user_default', ['userId', 'isDefault'])
export class UserCongregation {
  @PrimaryColumn({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @PrimaryColumn({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({
    name: 'assigned_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  assignedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Congregation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;
}
