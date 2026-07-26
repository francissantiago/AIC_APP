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
import { User } from '../../users/entities/user.entity';
import { MissionBookletDestinationType } from '../enums/mission-booklet-destination-type.enum';
import { MissionBookletStatus } from '../enums/mission-booklet-status.enum';
import { MissionAssignment } from './mission-assignment.entity';
import { MissionBookletInstallment } from './mission-booklet-installment.entity';
import { MissionField } from './mission-field.entity';

@Entity({ name: 'mission_booklets' })
@Index('IDX_mission_booklets_congregation_status', ['congregationId', 'status'])
@Index('IDX_mission_booklets_member', ['memberId'])
@Index('IDX_mission_booklets_field', ['missionFieldId'])
@Index('IDX_mission_booklets_assignment', ['missionAssignmentId'])
export class MissionBooklet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @ManyToOne(() => Member, { nullable: false })
  @JoinColumn({ name: 'member_id' })
  member!: Member;

  @Column({
    name: 'destination_type',
    type: 'enum',
    enum: MissionBookletDestinationType,
  })
  destinationType!: MissionBookletDestinationType;

  @Column({
    name: 'mission_field_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  missionFieldId!: string | null;

  @ManyToOne(() => MissionField, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mission_field_id' })
  missionField!: MissionField | null;

  @Column({
    name: 'mission_assignment_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  missionAssignmentId!: string | null;

  @ManyToOne(() => MissionAssignment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mission_assignment_id' })
  missionAssignment!: MissionAssignment | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title!: string | null;

  @Column({ name: 'installment_count', type: 'smallint', unsigned: true })
  installmentCount!: number;

  @Column({
    name: 'installment_amount',
    type: 'decimal',
    precision: 13,
    scale: 2,
  })
  installmentAmount!: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 13, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'first_due_date', type: 'date' })
  firstDueDate!: string;

  @Column({
    type: 'enum',
    enum: MissionBookletStatus,
    default: MissionBookletStatus.ACTIVE,
  })
  status!: MissionBookletStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @OneToMany(
    () => MissionBookletInstallment,
    (installment) => installment.booklet,
  )
  installments!: MissionBookletInstallment[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
