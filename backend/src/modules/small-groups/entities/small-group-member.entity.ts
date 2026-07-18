import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { SmallGroupMemberRole } from '../enums/small-group-member-role.enum';
import { SmallGroupMemberStatus } from '../enums/small-group-member-status.enum';
import { SmallGroup } from './small-group.entity';

@Entity({ name: 'small_group_members' })
@Index('IDX_small_group_members_member', ['memberId'])
export class SmallGroupMember {
  @PrimaryColumn({ name: 'small_group_id', type: 'char', length: 36 })
  smallGroupId!: string;

  @PrimaryColumn({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({
    type: 'enum',
    enum: SmallGroupMemberRole,
    default: SmallGroupMemberRole.MEMBER,
  })
  role!: SmallGroupMemberRole;

  @Column({
    type: 'enum',
    enum: SmallGroupMemberStatus,
    default: SmallGroupMemberStatus.ACTIVE,
  })
  status!: SmallGroupMemberStatus;

  @Column({
    name: 'joined_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  joinedAt!: Date;

  @ManyToOne(() => SmallGroup, (group) => group.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'small_group_id' })
  smallGroup!: SmallGroup;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;
}
