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
import { SecretariatDocument } from '../../secretariat/documents/entities/secretariat-document.entity';
import { User } from '../../users/entities/user.entity';
import { MemberTransferStatus } from '../enums/member-transfer-status.enum';

@Entity({ name: 'member_transfers' })
@Index('IDX_member_transfers_member', ['memberId'])
@Index('IDX_member_transfers_congregation_status', ['congregationId', 'status'])
@Index('IDX_member_transfers_document', ['documentId'])
@Index('IDX_member_transfers_requested_by', ['requestedByUserId'])
export class MemberTransfer {
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

  @Column({ name: 'destination_church_name', type: 'varchar', length: 200 })
  destinationChurchName!: string;

  @Column({ name: 'destination_city', type: 'varchar', length: 100 })
  destinationCity!: string;

  @Column({
    name: 'requested_at',
    type: 'datetime',
    precision: 6,
  })
  requestedAt!: Date;

  @Column({
    name: 'approved_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  approvedAt!: Date | null;

  @Column({
    type: 'enum',
    enum: MemberTransferStatus,
    default: MemberTransferStatus.PENDING,
  })
  status!: MemberTransferStatus;

  @Column({
    name: 'document_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  documentId!: string | null;

  @ManyToOne(() => SecretariatDocument, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'document_id' })
  document!: SecretariatDocument | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'requested_by_user_id', type: 'char', length: 36 })
  requestedByUserId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
