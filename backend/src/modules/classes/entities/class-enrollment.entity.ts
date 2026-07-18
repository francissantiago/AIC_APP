import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';
import { EbdClass } from './class.entity';

@Entity({ name: 'class_enrollments' })
@Index('IDX_class_enrollments_member', ['memberId'])
@Index('IDX_class_enrollments_class_status', ['classId', 'status'])
export class ClassEnrollment {
  @PrimaryColumn({ name: 'class_id', type: 'char', length: 36 })
  classId!: string;

  @PrimaryColumn({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({
    type: 'enum',
    enum: ClassEnrollmentStatus,
    default: ClassEnrollmentStatus.ACTIVE,
  })
  status!: ClassEnrollmentStatus;

  @Column({
    name: 'enrolled_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  enrolledAt!: Date;

  @ManyToOne(() => EbdClass, (ebdClass) => ebdClass.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'class_id' })
  ebdClass!: EbdClass;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;
}
