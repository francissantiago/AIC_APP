import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { FamilyRelation } from '../enums/family-relation.enum';
import { Family } from './family.entity';

@Entity({ name: 'family_members' })
@Unique('UQ_family_members_member', ['memberId'])
@Index('IDX_family_members_family_relation', ['familyId', 'relation'])
export class FamilyMember {
  @PrimaryColumn({ name: 'family_id', type: 'char', length: 36 })
  familyId!: string;

  @PrimaryColumn({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({
    type: 'enum',
    enum: FamilyRelation,
    default: FamilyRelation.OTHER,
  })
  relation!: FamilyRelation;

  @Column({
    name: 'joined_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  joinedAt!: Date;

  @ManyToOne(() => Family, (family) => family.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'family_id' })
  family!: Family;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;
}
