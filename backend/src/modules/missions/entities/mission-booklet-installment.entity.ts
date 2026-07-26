import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { FinancialEntry } from '../../finance/entities/financial-entry.entity';
import { MissionBookletInstallmentStatus } from '../enums/mission-booklet-installment-status.enum';
import { MissionBooklet } from './mission-booklet.entity';

@Entity({ name: 'mission_booklet_installments' })
@Unique('UQ_mission_booklet_installments_booklet_number', [
  'bookletId',
  'installmentNumber',
])
@Index('IDX_mission_booklet_installments_status_due', [
  'bookletId',
  'status',
  'dueDate',
])
export class MissionBookletInstallment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booklet_id', type: 'char', length: 36 })
  bookletId!: string;

  @ManyToOne(() => MissionBooklet, (booklet) => booklet.installments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booklet_id' })
  booklet!: MissionBooklet;

  @Column({ name: 'installment_number', type: 'smallint', unsigned: true })
  installmentNumber!: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: MissionBookletInstallmentStatus,
    default: MissionBookletInstallmentStatus.PENDING,
  })
  status!: MissionBookletInstallmentStatus;

  @Column({ name: 'paid_at', type: 'datetime', precision: 6, nullable: true })
  paidAt!: Date | null;

  @Column({
    name: 'financial_entry_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  financialEntryId!: string | null;

  @ManyToOne(() => FinancialEntry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'financial_entry_id' })
  financialEntry!: FinancialEntry | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
