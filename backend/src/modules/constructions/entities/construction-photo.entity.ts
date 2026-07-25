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
import { ConstructionProject } from './construction-project.entity';
import { ConstructionUpdate } from './construction-update.entity';

@Entity({ name: 'construction_photos' })
@Index('IDX_construction_photos_project', ['constructionProjectId'])
@Index('IDX_construction_photos_update', ['constructionUpdateId'])
export class ConstructionPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'construction_project_id', type: 'char', length: 36 })
  constructionProjectId!: string;

  @ManyToOne(() => ConstructionProject, (project) => project.photos, {
    nullable: false,
  })
  @JoinColumn({ name: 'construction_project_id' })
  constructionProject!: ConstructionProject;

  @Column({
    name: 'construction_update_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  constructionUpdateId!: string | null;

  @ManyToOne(() => ConstructionUpdate, (update) => update.photos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'construction_update_id' })
  constructionUpdate!: ConstructionUpdate | null;

  @Column({ name: 'uploaded_by_user_id', type: 'char', length: 36 })
  uploadedByUserId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser!: User;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'int', unsigned: true })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  caption!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
