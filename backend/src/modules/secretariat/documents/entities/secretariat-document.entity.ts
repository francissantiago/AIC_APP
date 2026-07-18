import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '../../enums/secretariat.enums';

@Entity({ name: 'secretariat_documents' })
@Index('IDX_secretariat_documents_congregation_document_date', [
  'congregationId',
  'documentDate',
])
@Index('IDX_secretariat_documents_congregation_type_status', [
  'congregationId',
  'type',
  'status',
])
export class SecretariatDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @Column({ name: 'created_by_user_id', type: 'char', length: 36 })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'enum', enum: SecretariatDocumentType })
  type!: SecretariatDocumentType;

  @Column({ name: 'document_date', type: 'date' })
  documentDate!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({
    type: 'enum',
    enum: SecretariatDocumentStatus,
    default: SecretariatDocumentStatus.DRAFT,
  })
  status!: SecretariatDocumentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
