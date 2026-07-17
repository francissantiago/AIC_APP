import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { FinancialType } from '../enums/finance.enums';
import { FinancialEntry } from './financial-entry.entity';

@Entity({ name: 'financial_categories' })
@Unique('UQ_financial_categories_congregation_type_name', [
  'congregationId',
  'type',
  'name',
])
@Index('IDX_financial_categories_congregation_type_active', [
  'congregationId',
  'type',
  'active',
])
export class FinancialCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: FinancialType })
  type!: FinancialType;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @OneToMany(() => FinancialEntry, (entry) => entry.category)
  entries!: FinancialEntry[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
