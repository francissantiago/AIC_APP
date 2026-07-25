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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { Member } from '../../members/entities/member.entity';
import { MissionFieldStatus } from '../enums/mission-field-status.enum';
import { MissionAssignment } from './mission-assignment.entity';

@Entity({ name: 'mission_fields' })
@Unique('UQ_mission_fields_congregation_name', ['congregationId', 'name'])
@Index('IDX_mission_fields_congregation_status', ['congregationId', 'status'])
@Index('IDX_mission_fields_coordinator', ['coordinatorMemberId'])
export class MissionField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  country!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({
    name: 'coordinator_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  coordinatorMemberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coordinator_member_id' })
  coordinatorMember!: Member | null;

  @Column({
    type: 'enum',
    enum: MissionFieldStatus,
    default: MissionFieldStatus.ACTIVE,
  })
  status!: MissionFieldStatus;

  @OneToMany(() => MissionAssignment, (assignment) => assignment.missionField)
  assignments!: MissionAssignment[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
