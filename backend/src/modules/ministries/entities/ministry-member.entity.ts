import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { MinistryMemberRole } from '../enums/ministry-member-role.enum';
import { Ministry } from './ministry.entity';

@Entity({ name: 'ministry_members' })
@Index('IDX_ministry_members_member', ['memberId'])
@Index('IDX_ministry_members_ministry_role', ['ministryId', 'role'])
export class MinistryMember {
  @PrimaryColumn({ name: 'ministry_id', type: 'char', length: 36 })
  ministryId!: string;

  @PrimaryColumn({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({
    type: 'enum',
    enum: MinistryMemberRole,
    default: MinistryMemberRole.MEMBER,
  })
  role!: MinistryMemberRole;

  @Column({
    name: 'joined_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  joinedAt!: Date;

  @ManyToOne(() => Ministry, (ministry) => ministry.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ministry_id' })
  ministry!: Ministry;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;
}
