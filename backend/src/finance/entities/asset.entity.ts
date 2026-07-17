import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AssetStatus, AssetType } from '../enums/finance.enums';

@Entity({ name: 'assets' })
@Unique('UQ_assets_congregation_asset_tag', ['congregationId', 'assetTag'])
@Index('IDX_assets_congregation_status', ['congregationId', 'status'])
@Index('IDX_assets_congregation_type', ['congregationId', 'type'])
@Index('IDX_assets_created_by', ['createdByUserId'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @Column({ name: 'asset_tag', type: 'varchar', length: 50, nullable: true })
  assetTag!: string | null;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'enum', enum: AssetType })
  type!: AssetType;

  @Column({ name: 'acquisition_date', type: 'date', nullable: true })
  acquisitionDate!: string | null;

  @Column({
    name: 'acquisition_value',
    type: 'decimal',
    precision: 13,
    scale: 2,
    nullable: true,
  })
  acquisitionValue!: string | null;

  @Column({
    name: 'current_value',
    type: 'decimal',
    precision: 13,
    scale: 2,
    nullable: true,
  })
  currentValue!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location!: string | null;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVE,
  })
  status!: AssetStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
