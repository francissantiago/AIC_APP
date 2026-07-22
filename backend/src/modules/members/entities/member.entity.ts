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
import { User } from '../../users/entities/user.entity';
import { MemberGender } from '../enums/member-gender.enum';
import { MemberMaritalStatus } from '../enums/member-marital-status.enum';
import { MemberStatus } from '../enums/member-status.enum';

@Entity({ name: 'members' })
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_members_full_name')
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  document!: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: string | null;

  @Column({
    type: 'enum',
    enum: MemberGender,
    default: MemberGender.UNSPECIFIED,
  })
  gender!: MemberGender;

  @Column({
    name: 'marital_status',
    type: 'enum',
    enum: MemberMaritalStatus,
    default: MemberMaritalStatus.OTHER,
  })
  maritalStatus!: MemberMaritalStatus;

  @Index('IDX_members_status')
  @Column({
    type: 'enum',
    enum: MemberStatus,
    default: MemberStatus.ACTIVE,
  })
  status!: MemberStatus;

  @Column({ name: 'baptism_date', type: 'date', nullable: true })
  baptismDate!: string | null;

  @Column({ name: 'membership_date', type: 'date', nullable: true })
  membershipDate!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state!: string | null;

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  rg!: string | null;

  @Column({
    name: 'registration_number',
    type: 'char',
    length: 6,
    nullable: true,
  })
  registrationNumber!: string | null;

  @Column({
    name: 'place_of_birth',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  placeOfBirth!: string | null;

  @Column({ name: 'blood_type', type: 'varchar', length: 10, nullable: true })
  bloodType!: string | null;

  @Column({ name: 'father_name', type: 'varchar', length: 150, nullable: true })
  fatherName!: string | null;

  @Column({ name: 'mother_name', type: 'varchar', length: 150, nullable: true })
  motherName!: string | null;

  @Column({
    name: 'position_title',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  positionTitle!: string | null;

  @Column({ name: 'photo_path', type: 'varchar', length: 500, nullable: true })
  photoPath!: string | null;

  @Index('IDX_members_congregation_id')
  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, (congregation) => congregation.members, {
    nullable: false,
  })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
