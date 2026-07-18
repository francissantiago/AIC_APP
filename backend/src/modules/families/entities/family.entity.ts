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
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { Member } from '../../members/entities/member.entity';
import { FamilyMember } from './family-member.entity';

@Entity({ name: 'families' })
@Index('IDX_families_congregation', ['congregationId'])
@Index('IDX_families_head_member', ['headMemberId'])
@Index('IDX_families_congregation_name', ['congregationId', 'name'])
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({
    name: 'head_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  headMemberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'head_member_id' })
  headMember!: Member | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => FamilyMember, (link) => link.family)
  members!: FamilyMember[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
