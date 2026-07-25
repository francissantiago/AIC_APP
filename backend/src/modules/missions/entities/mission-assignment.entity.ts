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
import { Congregation } from '../../congregations/entities/congregation.entity';
import { Member } from '../../members/entities/member.entity';
import { MissionAssignmentRole } from '../enums/mission-assignment-role.enum';
import { MissionAssignmentStatus } from '../enums/mission-assignment-status.enum';
import { MissionField } from './mission-field.entity';

@Entity({ name: 'mission_assignments' })
@Index('IDX_mission_assignments_congregation_status', [
  'congregationId',
  'status',
])
@Index('IDX_mission_assignments_member', ['memberId'])
@Index('IDX_mission_assignments_field', ['missionFieldId'])
export class MissionAssignment {
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

  @Column({ name: 'mission_field_id', type: 'char', length: 36 })
  missionFieldId!: string;

  @ManyToOne(() => MissionField, (field) => field.assignments, {
    nullable: false,
  })
  @JoinColumn({ name: 'mission_field_id' })
  missionField!: MissionField;

  @Column({
    type: 'enum',
    enum: MissionAssignmentRole,
    default: MissionAssignmentRole.MISSIONARY,
  })
  role!: MissionAssignmentRole;

  @Column({
    type: 'enum',
    enum: MissionAssignmentStatus,
    default: MissionAssignmentStatus.ACTIVE,
  })
  status!: MissionAssignmentStatus;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'expected_end_date', type: 'date', nullable: true })
  expectedEndDate!: string | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
