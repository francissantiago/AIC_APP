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
import { Member } from '../../members/entities/member.entity';
import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';
import { Family } from './family.entity';

@Entity({ name: 'family_member_relations' })
@Unique('UQ_family_member_relations_edge', [
  'familyId',
  'fromMemberId',
  'toMemberId',
  'relation',
])
@Index('IDX_family_member_relations_family', ['familyId'])
@Index('IDX_family_member_relations_from', ['fromMemberId'])
@Index('IDX_family_member_relations_to', ['toMemberId'])
export class FamilyMemberRelation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'family_id', type: 'char', length: 36 })
  familyId!: string;

  @Column({ name: 'from_member_id', type: 'char', length: 36 })
  fromMemberId!: string;

  @Column({ name: 'to_member_id', type: 'char', length: 36 })
  toMemberId!: string;

  @Column({
    type: 'enum',
    enum: FamilyMemberLinkRelation,
  })
  relation!: FamilyMemberLinkRelation;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family!: Family;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_member_id' })
  fromMember!: Member;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_member_id' })
  toMember!: Member;
}
