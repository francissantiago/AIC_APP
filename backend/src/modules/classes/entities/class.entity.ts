import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { Member } from '../../members/entities/member.entity';
import { ClassAgeGroup } from '../enums/class-age-group.enum';
import { ClassStatus } from '../enums/class-status.enum';

@Entity({ name: 'classes' })
@Unique('UQ_classes_congregation_name', ['congregationId', 'name'])
@Index('IDX_classes_congregation_status', ['congregationId', 'status'])
@Index('IDX_classes_teacher_member', ['teacherMemberId'])
export class EbdClass {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({
    name: 'age_group',
    type: 'enum',
    enum: ClassAgeGroup,
    default: ClassAgeGroup.MIXED,
  })
  ageGroup!: ClassAgeGroup;

  @Column({
    name: 'teacher_member_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  teacherMemberId!: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacher_member_id' })
  teacherMember!: Member | null;

  @Column({
    name: 'day_of_week',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  room!: string | null;

  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  status!: ClassStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
