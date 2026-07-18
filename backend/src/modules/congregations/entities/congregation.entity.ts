import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { CongregationStatus } from '../enums/congregation-status.enum';
import { CongregationType } from '../enums/congregation-type.enum';

@Entity({ name: 'congregations' })
export class Congregation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_congregations_name')
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 150, nullable: true })
  tradeName!: string | null;

  @Index('IDX_congregations_type')
  @Column({
    type: 'enum',
    enum: CongregationType,
    default: CongregationType.HEADQUARTERS,
  })
  type!: CongregationType;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  document!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state!: string | null;

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode!: string | null;

  @Column({ name: 'foundation_date', type: 'date', nullable: true })
  foundationDate!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

  @Index('IDX_congregations_status')
  @Column({
    type: 'enum',
    enum: CongregationStatus,
    default: CongregationStatus.ACTIVE,
  })
  status!: CongregationStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => Member, (member) => member.congregation)
  members!: Member[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
