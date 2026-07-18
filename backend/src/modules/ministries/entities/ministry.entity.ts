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
import { MinistryStatus } from '../enums/ministry-status.enum';
import { MinistryMember } from './ministry-member.entity';

@Entity({ name: 'ministries' })
@Unique('UQ_ministries_congregation_name', ['congregationId', 'name'])
@Index('IDX_ministries_congregation_status', ['congregationId', 'status'])
@Index('IDX_ministries_leader_member', ['leaderMemberId'])
export class Ministry {
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

  @Column({
    type: 'enum',
    enum: MinistryStatus,
    default: MinistryStatus.ACTIVE,
  })
  status!: MinistryStatus;

  @OneToMany(() => MinistryMember, (link) => link.ministry)
  members!: MinistryMember[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
