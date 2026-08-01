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
import { ConstructionProject } from '../../constructions/entities/construction-project.entity';
import { Member } from '../../members/entities/member.entity';
import { SocialProject } from '../../social-projects/entities/social-project.entity';
import { User } from '../../users/entities/user.entity';
import { FinancialType, PaymentMethod } from '../enums/finance.enums';
import { FinancialCategory } from './financial-category.entity';

@Entity({ name: 'financial_entries' })
@Index('IDX_financial_entries_congregation_date', [
  'congregationId',
  'entryDate',
])
@Index('IDX_financial_entries_congregation_type_date', [
  'congregationId',
  'type',
  'entryDate',
])
@Index('IDX_financial_entries_category', ['categoryId'])
@Index('IDX_financial_entries_created_by', ['createdByUserId'])
@Index('IDX_financial_entries_member_date', ['memberId', 'entryDate'])
@Index('IDX_financial_entries_construction_project', ['constructionProjectId'])
@Index('IDX_financial_entries_social_project', ['socialProjectId'])
@Index('IDX_financial_entries_mission_field', ['missionFieldId'])
@Index('IDX_financial_entries_mission_booklet_installment', [
  'missionBookletInstallmentId',
])
export class FinancialEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'category_id', type: 'char', length: 36 })
  categoryId!: string;

  @ManyToOne(() => FinancialCategory, (category) => category.entries, {
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category!: FinancialCategory;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'member_id', type: 'char', length: 36, nullable: true })
  memberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_id' })
  member!: Member | null;

  @Column({
    name: 'construction_project_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  constructionProjectId!: string | null;

  @ManyToOne(() => ConstructionProject, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'construction_project_id' })
  constructionProject!: ConstructionProject | null;

  @Column({
    name: 'social_project_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  socialProjectId!: string | null;

  @ManyToOne(() => SocialProject, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'social_project_id' })
  socialProject!: SocialProject | null;

  @Column({
    name: 'mission_field_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  missionFieldId!: string | null;

  @Column({
    name: 'mission_booklet_installment_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  missionBookletInstallmentId!: string | null;

  @Column({ type: 'enum', enum: FinancialType })
  type!: FinancialType;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  amount!: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.OTHER,
  })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
