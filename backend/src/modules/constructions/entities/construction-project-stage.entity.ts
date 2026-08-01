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
import { ConstructionProject } from './construction-project.entity';

@Entity({ name: 'construction_project_stages' })
@Index('IDX_construction_project_stages_project', ['constructionProjectId'])
@Index('IDX_construction_project_stages_congregation', ['congregationId'])
export class ConstructionProjectStage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36 })
  congregationId!: string;

  @ManyToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'construction_project_id', type: 'char', length: 36 })
  constructionProjectId!: string;

  @ManyToOne(() => ConstructionProject, { nullable: false })
  @JoinColumn({ name: 'construction_project_id' })
  constructionProject!: ConstructionProject;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ name: 'sort_order', type: 'smallint', unsigned: true })
  sortOrder!: number;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6 })
  deletedAt!: Date | null;
}
