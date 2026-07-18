import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { Member } from '../../members/entities/member.entity';
import { SmallGroupStatus } from '../enums/small-group-status.enum';
import { SmallGroupMember } from './small-group-member.entity';
import { SmallGroupMeeting } from './small-group-meeting.entity';

@Entity({ name: 'small_groups' })
@Unique('UQ_small_groups_congregation_name', ['congregationId', 'name'])
@Index('IDX_small_groups_congregation', ['congregationId'])
@Index('IDX_small_groups_leader', ['leaderMemberId'])
export class SmallGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({
    name: 'leader_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  leaderMemberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leader_member_id' })
  leaderMember!: Member | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({
    name: 'day_of_week',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({
    type: 'enum',
    enum: SmallGroupStatus,
    default: SmallGroupStatus.ACTIVE,
  })
  status!: SmallGroupStatus;

  @OneToMany(() => SmallGroupMember, (link) => link.smallGroup)
  members!: SmallGroupMember[];

  @OneToMany(() => SmallGroupMeeting, (meeting) => meeting.smallGroup)
  meetings!: SmallGroupMeeting[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
