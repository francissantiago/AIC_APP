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
import { ConstructionPhoto } from './construction-photo.entity';
import { ConstructionProject } from './construction-project.entity';

@Entity({ name: 'construction_updates' })
@Index('IDX_construction_updates_project', ['constructionProjectId'])
@Index('IDX_construction_updates_congregation', ['congregationId'])
export class ConstructionUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'construction_project_id', type: 'char', length: 36 })
  constructionProjectId!: string;

  @ManyToOne(() => ConstructionProject, (project) => project.updates, {
    nullable: false,
  })
  @JoinColumn({ name: 'construction_project_id' })
  constructionProject!: ConstructionProject;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'progress_percent',
    type: 'tinyint',
    unsigned: true,
    nullable: true,
  })
  progressPercent!: number | null;

  @Column({ name: 'recorded_at', type: 'date' })
  recordedAt!: string;

  @OneToMany(() => ConstructionPhoto, (photo) => photo.constructionUpdate)
  photos!: ConstructionPhoto[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
